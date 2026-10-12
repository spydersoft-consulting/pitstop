using Spydersoft.PitStop.Api.Services;
using Spydersoft.PitStop.Contracts.Locations;
using Spydersoft.PitStop.Contracts.Maintenance;
using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Spydersoft.FileStore.Contracts;

namespace Spydersoft.PitStop.Api.Controllers;

[ApiController]
[Route("api/v1/vehicles/{vehicleId:int}/maintenance")]
public class MaintenanceLogsController(
    PitStopDbContext db,
    LocationService locationService,
    IFileStoreClient fileStore)
    : PitStopControllerBase(db)
{
    private const string AttachmentSource = "pitstop";
    private const string AttachmentEntityType = "maintenance-log";

    private const string OrderByOdometer = "odometer";
    private const string OrderAscending = "asc";

    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.Read)]
    public async Task<ActionResult<MaintenanceLogListResponse>> GetAll(
        int vehicleId,
        [FromQuery] MaintenanceLogQuery listQuery,
        CancellationToken ct = default)
    {
        if (!await VehicleExistsAsync(vehicleId, GetCurrentUserId(), ct))
            return NotFound();

        var pageSize = Math.Clamp(listQuery.PageSize, 1, 100);

        var query = Db.MaintenanceLogs.Where(m => m.VehicleId == vehicleId);

        if (listQuery.StartDate.HasValue)
            query = query.Where(m => m.ServiceDate >= listQuery.StartDate.Value);
        if (listQuery.EndDate.HasValue)
            query = query.Where(m => m.ServiceDate <= listQuery.EndDate.Value);

        if (!string.IsNullOrEmpty(listQuery.ServiceType))
        {
            if (!Enum.TryParse<MaintenanceType>(listQuery.ServiceType, ignoreCase: true, out var serviceType))
                return ValidationProblem($"Invalid serviceType '{listQuery.ServiceType}'.");
            query = query.Where(m => m.Items.Any(i => i.ServiceType == serviceType));
        }

        if (!string.IsNullOrEmpty(listQuery.PerformedBy))
        {
            if (!Enum.TryParse<ServicePerformedBy>(listQuery.PerformedBy, ignoreCase: true, out var performedBy))
                return ValidationProblem($"Invalid performedBy '{listQuery.PerformedBy}'.");
            query = query.Where(m => m.PerformedBy == performedBy);
        }

        var totalCount = await query.CountAsync(ct);

        query = (listQuery.SortBy.ToLowerInvariant(), listQuery.Order.ToLowerInvariant()) switch
        {
            (OrderByOdometer, OrderAscending) => query.OrderBy(m => m.OdometerReading),
            (OrderByOdometer, _) => query.OrderByDescending(m => m.OdometerReading),
            (_, OrderAscending) => query.OrderBy(m => m.ServiceDate),
            _ => query.OrderByDescending(m => m.ServiceDate)
        };

        var items = await query
            .Include(m => m.Location)
            .Include(m => m.Items)
            .Include(m => m.Attachments)
            .Skip((listQuery.Page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return Ok(new MaintenanceLogListResponse
        {
            Items = items.Select(MapToDto).ToList(),
            TotalCount = totalCount,
            Page = listQuery.Page,
            PageSize = pageSize
        });
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.Read)]
    public async Task<ActionResult<MaintenanceLogDto>> GetById(int vehicleId, int id, CancellationToken ct)
    {
        if (!await VehicleExistsAsync(vehicleId, GetCurrentUserId(), ct))
            return NotFound();

        var log = await Db.MaintenanceLogs
            .Include(m => m.Location)
            .Include(m => m.Items)
            .Include(m => m.Attachments)
            .FirstOrDefaultAsync(m => m.Id == id && m.VehicleId == vehicleId, ct);
        return log is null ? NotFound() : Ok(MapToDto(log));
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.Write)]
    public async Task<ActionResult<MaintenanceLogDto>> Create(int vehicleId, CreateMaintenanceLogRequest request, CancellationToken ct)
    {
        var ownerId = GetCurrentUserId();
        if (!await VehicleExistsAsync(vehicleId, ownerId, ct))
            return NotFound();

        if (!Enum.TryParse<ServicePerformedBy>(request.PerformedBy, ignoreCase: true, out var performedBy))
            return ValidationProblem($"Invalid performedBy '{request.PerformedBy}'.");
        var (items, itemsError) = BuildItems(request.Items);
        if (itemsError is not null)
            return ValidationProblem(itemsError);

        var (location, error) = await locationService.ResolveForFillUpAsync(
            ownerId, request.LocationId, request.Location, ct);
        if (error is not null)
            return ValidationProblem(error);

        var log = new MaintenanceLog { VehicleId = vehicleId };
        ApplyRequest(log, request.ServiceDate, request.OdometerReading, request.Notes, performedBy);
        log.Items = items;

        if (location is not null)
        {
            log.Location = location;
            LocationService.TouchUsage(location, log.ServiceDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
        }

        Db.MaintenanceLogs.Add(log);
        await Db.SaveChangesAsync(ct);

        await Db.Entry(log).Reference(m => m.Location).LoadAsync(ct);
        return CreatedAtAction(nameof(GetById), new { vehicleId, id = log.Id }, MapToDto(log));
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.Write)]
    public async Task<ActionResult<MaintenanceLogDto>> Update(int vehicleId, int id, UpdateMaintenanceLogRequest request, CancellationToken ct)
    {
        var ownerId = GetCurrentUserId();
        if (!await VehicleExistsAsync(vehicleId, ownerId, ct))
            return NotFound();

        if (!Enum.TryParse<ServicePerformedBy>(request.PerformedBy, ignoreCase: true, out var performedBy))
            return ValidationProblem($"Invalid performedBy '{request.PerformedBy}'.");
        var (items, itemsError) = BuildItems(request.Items);
        if (itemsError is not null)
            return ValidationProblem(itemsError);

        var log = await Db.MaintenanceLogs
            .Include(m => m.Location)
            .Include(m => m.Items)
            .FirstOrDefaultAsync(m => m.Id == id && m.VehicleId == vehicleId, ct);
        if (log is null)
            return NotFound();

        var (newLocation, error) = await locationService.ResolveForFillUpAsync(
            ownerId, request.LocationId, request.Location, ct);
        if (error is not null)
            return ValidationProblem(error);

        var oldLocation = log.Location;
        ApplyRequest(log, request.ServiceDate, request.OdometerReading, request.Notes, performedBy);
        Db.MaintenanceLogItems.RemoveRange(log.Items);
        log.Items = items;

        if (oldLocation?.Id != newLocation?.Id)
        {
            if (oldLocation is not null)
                LocationService.DecrementUsage(oldLocation);
            if (newLocation is not null)
                LocationService.TouchUsage(newLocation, log.ServiceDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
            log.Location = newLocation;
        }

        await Db.SaveChangesAsync(ct);

        return Ok(MapToDto(log));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.Write)]
    public async Task<IActionResult> Delete(int vehicleId, int id, CancellationToken ct)
    {
        if (!await VehicleExistsAsync(vehicleId, GetCurrentUserId(), ct))
            return NotFound();

        var log = await Db.MaintenanceLogs
            .Include(m => m.Location)
            .FirstOrDefaultAsync(m => m.Id == id && m.VehicleId == vehicleId, ct);
        if (log is null)
            return NotFound();

        if (log.Location is not null)
            LocationService.DecrementUsage(log.Location);

        log.IsDeleted = true;
        await Db.SaveChangesAsync(ct);

        return NoContent();
    }

    private static void ApplyRequest(MaintenanceLog log, DateOnly serviceDate, decimal odometerReading, string? notes, ServicePerformedBy performedBy)
    {
        log.ServiceDate = serviceDate;
        log.OdometerReading = odometerReading;
        log.PerformedBy = performedBy;
        log.Notes = notes;
    }

    private static (List<MaintenanceLogItem> Items, string? Error) BuildItems(List<MaintenanceLogItemRequest> requests)
    {
        var items = new List<MaintenanceLogItem>(requests.Count);
        foreach (var r in requests)
        {
            if (!Enum.TryParse<MaintenanceType>(r.ServiceType, ignoreCase: true, out var serviceType))
                return ([], $"Invalid serviceType '{r.ServiceType}'.");

            items.Add(new MaintenanceLogItem
            {
                ServiceType = serviceType,
                Description = r.Description,
                IsWarrantyWork = r.IsWarrantyWork,
                PartsCost = r.PartsCost,
                LaborCost = r.LaborCost,
                TotalCost = r.TotalCost,
            });
        }
        return (items, null);
    }

    private static decimal? ComputeItemCost(MaintenanceLogItem i) =>
        i.TotalCost ?? (i.PartsCost.HasValue || i.LaborCost.HasValue
            ? (i.PartsCost ?? 0) + (i.LaborCost ?? 0)
            : null);

    private static MaintenanceLogDto MapToDto(MaintenanceLog m)
    {
        var items = m.Items
            .OrderBy(i => i.Id)
            .Select(i => new MaintenanceLogItemDto
            {
                Id = i.Id,
                ServiceType = i.ServiceType.ToString(),
                Description = i.Description,
                IsWarrantyWork = i.IsWarrantyWork,
                PartsCost = i.PartsCost,
                LaborCost = i.LaborCost,
                TotalCost = i.TotalCost,
                ComputedTotalCost = ComputeItemCost(i),
            })
            .ToList();

        var itemCosts = items.Where(i => i.ComputedTotalCost.HasValue).ToList();

        return new MaintenanceLogDto
        {
            Id = m.Id,
            VehicleId = m.VehicleId,
            ServiceDate = m.ServiceDate,
            OdometerReading = m.OdometerReading,
            PerformedBy = m.PerformedBy.ToString(),
            Location = m.Location is null ? null : new LocationSummaryDto
            {
                Id = m.Location.Id,
                Name = m.Location.Name,
                Address = m.Location.Address,
            },
            Notes = m.Notes,
            Items = items,
            Attachments = m.Attachments
                .Where(a => a.IsConfirmed)
                .Select(a => new MaintenanceAttachmentDto
                {
                    Id = a.Id,
                    FileId = a.FileId,
                    FileName = a.FileName,
                    ContentType = a.ContentType,
                })
                .ToList(),
            ComputedTotalCost = itemCosts.Count > 0 ? itemCosts.Sum(i => i.ComputedTotalCost.GetValueOrDefault()) : null,
        };
    }

    [HttpPost("{id:int}/attachments/initiate")]
    [Authorize(Policy = AuthorizationPolicies.Write)]
    public async Task<ActionResult<InitiateAttachmentUploadResponse>> InitiateAttachmentUpload(
        int vehicleId, int id, InitiateAttachmentUploadRequest request, CancellationToken ct)
    {
        if (!await VehicleExistsAsync(vehicleId, GetCurrentUserId(), ct))
            return NotFound();

        var logExists = await Db.MaintenanceLogs.AnyAsync(m => m.Id == id && m.VehicleId == vehicleId, ct);
        if (!logExists)
            return NotFound();

        InitiateUploadResponse uploadResponse;
        try
        {
            uploadResponse = await fileStore.InitiateUploadAsync(new InitiateUploadRequest(
                AttachmentSource, AttachmentEntityType, id.ToString(), request.FileName, request.ContentType, request.SizeBytes), ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or InvalidOperationException)
        {
            return FileStoreUnavailable();
        }

        var attachment = new MaintenanceLogAttachment
        {
            MaintenanceLogId = id,
            FileId = uploadResponse.FileId,
            FileName = request.FileName,
            ContentType = request.ContentType,
            IsConfirmed = false,
        };
        Db.MaintenanceLogAttachments.Add(attachment);
        await Db.SaveChangesAsync(ct);

        return Ok(new InitiateAttachmentUploadResponse
        {
            AttachmentId = attachment.Id,
            UploadUrl = uploadResponse.UploadUrl,
            ExpiresAt = uploadResponse.UploadExpiresAt,
        });
    }

    [HttpPost("{id:int}/attachments/{attachmentId:int}/confirm")]
    [Authorize(Policy = AuthorizationPolicies.Write)]
    public async Task<ActionResult<MaintenanceAttachmentDto>> ConfirmAttachmentUpload(
        int vehicleId, int id, int attachmentId, CancellationToken ct)
    {
        if (!await VehicleExistsAsync(vehicleId, GetCurrentUserId(), ct))
            return NotFound();

        var attachment = await Db.MaintenanceLogAttachments
            .FirstOrDefaultAsync(a => a.Id == attachmentId && a.MaintenanceLogId == id, ct);
        if (attachment is null)
            return NotFound();

        try
        {
            await fileStore.ConfirmUploadAsync(attachment.FileId, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or InvalidOperationException)
        {
            return FileStoreUnavailable();
        }

        attachment.IsConfirmed = true;
        await Db.SaveChangesAsync(ct);

        return Ok(new MaintenanceAttachmentDto
        {
            Id = attachment.Id,
            FileId = attachment.FileId,
            FileName = attachment.FileName,
            ContentType = attachment.ContentType,
        });
    }

    [HttpGet("{id:int}/attachments/{attachmentId:int}/url")]
    [Authorize(Policy = AuthorizationPolicies.Read)]
    public async Task<ActionResult<FileUrlResponse>> GetAttachmentUrl(
        int vehicleId, int id, int attachmentId, CancellationToken ct)
    {
        if (!await VehicleExistsAsync(vehicleId, GetCurrentUserId(), ct))
            return NotFound();

        var attachment = await Db.MaintenanceLogAttachments
            .FirstOrDefaultAsync(a => a.Id == attachmentId && a.MaintenanceLogId == id && a.IsConfirmed, ct);
        if (attachment is null)
            return NotFound();

        try
        {
            var url = await fileStore.GetFileUrlAsync(attachment.FileId, ct);
            return Ok(url);
        }
        catch (Exception ex) when (ex is HttpRequestException or InvalidOperationException)
        {
            return FileStoreUnavailable();
        }
    }

    [HttpDelete("{id:int}/attachments/{attachmentId:int}")]
    [Authorize(Policy = AuthorizationPolicies.Write)]
    public async Task<IActionResult> DeleteAttachment(int vehicleId, int id, int attachmentId, CancellationToken ct)
    {
        if (!await VehicleExistsAsync(vehicleId, GetCurrentUserId(), ct))
            return NotFound();

        var attachment = await Db.MaintenanceLogAttachments
            .FirstOrDefaultAsync(a => a.Id == attachmentId && a.MaintenanceLogId == id, ct);
        if (attachment is null)
            return NotFound();

        try
        {
            await fileStore.DeleteFileAsync(attachment.FileId, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or InvalidOperationException)
        {
            return FileStoreUnavailable();
        }

        Db.MaintenanceLogAttachments.Remove(attachment);
        await Db.SaveChangesAsync(ct);

        return NoContent();
    }

    private ObjectResult FileStoreUnavailable() =>
        Problem(detail: "The file storage service is currently unavailable. Please try again later.", statusCode: StatusCodes.Status502BadGateway);
}
