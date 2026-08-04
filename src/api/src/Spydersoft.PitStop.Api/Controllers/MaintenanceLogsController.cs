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
            query = query.Where(m => m.ServiceType == serviceType);
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

        if (!Enum.TryParse<MaintenanceType>(request.ServiceType, ignoreCase: true, out var serviceType))
            return ValidationProblem($"Invalid serviceType '{request.ServiceType}'.");
        if (!Enum.TryParse<ServicePerformedBy>(request.PerformedBy, ignoreCase: true, out var performedBy))
            return ValidationProblem($"Invalid performedBy '{request.PerformedBy}'.");

        var (location, error) = await locationService.ResolveForFillUpAsync(
            ownerId, request.LocationId, request.Location, ct);
        if (error is not null)
            return ValidationProblem(error);

        var log = new MaintenanceLog { VehicleId = vehicleId };
        ApplyRequest(log, request, serviceType, performedBy);

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

        if (!Enum.TryParse<MaintenanceType>(request.ServiceType, ignoreCase: true, out var serviceType))
            return ValidationProblem($"Invalid serviceType '{request.ServiceType}'.");
        if (!Enum.TryParse<ServicePerformedBy>(request.PerformedBy, ignoreCase: true, out var performedBy))
            return ValidationProblem($"Invalid performedBy '{request.PerformedBy}'.");

        var log = await Db.MaintenanceLogs
            .Include(m => m.Location)
            .FirstOrDefaultAsync(m => m.Id == id && m.VehicleId == vehicleId, ct);
        if (log is null)
            return NotFound();

        var (newLocation, error) = await locationService.ResolveForFillUpAsync(
            ownerId, request.LocationId, request.Location, ct);
        if (error is not null)
            return ValidationProblem(error);

        var oldLocation = log.Location;
        ApplyRequest(log, request, serviceType, performedBy);

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

    private static void ApplyRequest(MaintenanceLog log, CreateMaintenanceLogRequest request, MaintenanceType serviceType, ServicePerformedBy performedBy)
    {
        log.ServiceDate = request.ServiceDate;
        log.OdometerReading = request.OdometerReading;
        log.ServiceType = serviceType;
        log.Description = request.Description;
        log.PerformedBy = performedBy;
        log.IsWarrantyWork = request.IsWarrantyWork;
        log.PartsCost = request.PartsCost;
        log.LaborCost = request.LaborCost;
        log.TotalCost = request.TotalCost;
        log.Notes = request.Notes;
    }

    private static void ApplyRequest(MaintenanceLog log, UpdateMaintenanceLogRequest request, MaintenanceType serviceType, ServicePerformedBy performedBy)
    {
        log.ServiceDate = request.ServiceDate;
        log.OdometerReading = request.OdometerReading;
        log.ServiceType = serviceType;
        log.Description = request.Description;
        log.PerformedBy = performedBy;
        log.IsWarrantyWork = request.IsWarrantyWork;
        log.PartsCost = request.PartsCost;
        log.LaborCost = request.LaborCost;
        log.TotalCost = request.TotalCost;
        log.Notes = request.Notes;
    }

    private static MaintenanceLogDto MapToDto(MaintenanceLog m) => new()
    {
        Id = m.Id,
        VehicleId = m.VehicleId,
        ServiceDate = m.ServiceDate,
        OdometerReading = m.OdometerReading,
        ServiceType = m.ServiceType.ToString(),
        Description = m.Description,
        PerformedBy = m.PerformedBy.ToString(),
        IsWarrantyWork = m.IsWarrantyWork,
        Location = m.Location is null ? null : new LocationSummaryDto
        {
            Id = m.Location.Id,
            Name = m.Location.Name,
            Address = m.Location.Address,
        },
        PartsCost = m.PartsCost,
        LaborCost = m.LaborCost,
        TotalCost = m.TotalCost,
        Notes = m.Notes,
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
        ComputedTotalCost = m.TotalCost ?? (m.PartsCost.HasValue || m.LaborCost.HasValue
            ? (m.PartsCost ?? 0) + (m.LaborCost ?? 0)
            : null)
    };

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

        var uploadResponse = await fileStore.InitiateUploadAsync(new InitiateUploadRequest(
            AttachmentSource, AttachmentEntityType, id.ToString(), request.FileName, request.ContentType, request.SizeBytes), ct);

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

        await fileStore.ConfirmUploadAsync(attachment.FileId, ct);

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

        var url = await fileStore.GetFileUrlAsync(attachment.FileId, ct);
        return Ok(url);
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

        await fileStore.DeleteFileAsync(attachment.FileId, ct);

        Db.MaintenanceLogAttachments.Remove(attachment);
        await Db.SaveChangesAsync(ct);

        return NoContent();
    }
}
