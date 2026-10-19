using Spydersoft.PitStop.Api.Services.Reminders;
using Spydersoft.PitStop.Contracts.Reminders;
using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Spydersoft.PitStop.Api.Controllers;

[ApiController]
[Route("api/v1")]
public class RemindersController(PitStopDbContext db, ReminderService reminderService) : PitStopControllerBase(db)
{
    private const int MaxMiles = 1_000_000;
    private const int MaxIntervalMonths = 1_200;
    private const int MaxLeadDays = 3_650;

    [HttpGet("reminder-templates")]
    [Authorize(Policy = AuthorizationPolicies.Read)]
    public ActionResult<IReadOnlyList<ReminderTemplateDto>> GetTemplates() =>
        Ok(ReminderTemplates.All.Select(t => new ReminderTemplateDto
        {
            ServiceType = t.ServiceType.ToString(),
            Name = t.Name,
            IntervalMiles = t.IntervalMiles,
            IntervalMonths = t.IntervalMonths,
            LeadMiles = t.LeadMiles,
            LeadDays = t.LeadDays,
        }).ToList());

    [HttpGet("vehicles/{vehicleId:int}/reminders")]
    [Authorize(Policy = AuthorizationPolicies.Read)]
    public async Task<ActionResult<List<ReminderDto>>> GetAll(int vehicleId, CancellationToken ct)
    {
        var vehicle = await FindVehicleAsync(vehicleId, ct);
        if (vehicle is null)
            return NotFound();

        var reminders = await Db.MaintenanceReminders
            .Where(r => r.VehicleId == vehicleId)
            .ToListAsync(ct);

        var evaluated = await reminderService.EvaluateAsync(vehicle, reminders, ct);
        return Ok(evaluated
            .Select(e => MapToDto(e.Reminder, e.Evaluation))
            .OrderBy(d => StatusOrder(d.Status))
            .ThenBy(d => d.ProjectedDueDate ?? d.NextDueDate ?? DateOnly.MaxValue)
            .ThenBy(d => d.Name)
            .ToList());
    }

    [HttpGet("vehicles/{vehicleId:int}/reminders/{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.Read)]
    public async Task<ActionResult<ReminderDto>> GetById(int vehicleId, int id, CancellationToken ct)
    {
        var vehicle = await FindVehicleAsync(vehicleId, ct);
        if (vehicle is null)
            return NotFound();

        var reminder = await Db.MaintenanceReminders.FirstOrDefaultAsync(r => r.Id == id && r.VehicleId == vehicleId, ct);
        return reminder is null ? NotFound() : Ok(await EvaluateOneAsync(vehicle, reminder, ct));
    }

    [HttpGet("vehicles/{vehicleId:int}/reminders/{id:int}/history")]
    [Authorize(Policy = AuthorizationPolicies.Read)]
    public async Task<ActionResult<List<ReminderHistoryEntryDto>>> GetHistory(int vehicleId, int id, CancellationToken ct)
    {
        if (await FindVehicleAsync(vehicleId, ct) is null)
            return NotFound();

        var reminder = await Db.MaintenanceReminders.FirstOrDefaultAsync(r => r.Id == id && r.VehicleId == vehicleId, ct);
        if (reminder is null)
            return NotFound();

        var history = await reminderService.HistoryAsync(reminder, ct);
        return Ok(history.Select(h => new ReminderHistoryEntryDto
        {
            MaintenanceLogId = h.LogId,
            ServiceDate = h.Date,
            Odometer = h.Odometer,
            DueDate = h.DueDate,
            DueOdometer = h.DueOdometer,
            DaysLate = h.DaysLate,
            MilesOver = h.MilesOver,
            WasLate = h.WasLate,
        }).ToList());
    }

    [HttpPost("vehicles/{vehicleId:int}/reminders")]
    [Authorize(Policy = AuthorizationPolicies.Write)]
    public async Task<ActionResult<ReminderDto>> Create(int vehicleId, ReminderRequest request, CancellationToken ct)
    {
        var vehicle = await FindVehicleAsync(vehicleId, ct);
        if (vehicle is null)
            return NotFound();

        var error = Validate(request, out var serviceType);
        if (error is not null)
            return ValidationProblem(error);

        var reminder = new MaintenanceReminder { VehicleId = vehicleId, Source = ReminderSource.User };
        ApplyRequest(reminder, request, serviceType);
        Db.MaintenanceReminders.Add(reminder);
        await Db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { vehicleId, id = reminder.Id }, await EvaluateOneAsync(vehicle, reminder, ct));
    }

    [HttpPost("vehicles/{vehicleId:int}/reminders/from-templates")]
    [Authorize(Policy = AuthorizationPolicies.Write)]
    public async Task<ActionResult<List<ReminderDto>>> CreateFromTemplates(
        int vehicleId, CreateRemindersFromTemplatesRequest request, CancellationToken ct)
    {
        var vehicle = await FindVehicleAsync(vehicleId, ct);
        if (vehicle is null)
            return NotFound();

        var templates = new List<ReminderTemplate>();
        foreach (var name in request.ServiceTypes.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (!Enum.TryParse<MaintenanceType>(name, ignoreCase: true, out var type) || ReminderTemplates.Find(type) is not { } template)
                return ValidationProblem($"No reminder template for serviceType '{name}'.");
            templates.Add(template);
        }

        var reminders = templates.Select(t => new MaintenanceReminder
        {
            VehicleId = vehicleId,
            ServiceType = t.ServiceType,
            Name = t.Name,
            IntervalMiles = t.IntervalMiles,
            IntervalMonths = t.IntervalMonths,
            LeadMiles = t.LeadMiles,
            LeadDays = t.LeadDays,
            Source = ReminderSource.Template,
        }).ToList();

        Db.MaintenanceReminders.AddRange(reminders);
        await Db.SaveChangesAsync(ct);

        var evaluated = await reminderService.EvaluateAsync(vehicle, reminders, ct);
        return Ok(evaluated.Select(e => MapToDto(e.Reminder, e.Evaluation)).ToList());
    }

    [HttpPut("vehicles/{vehicleId:int}/reminders/{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.Write)]
    public async Task<ActionResult<ReminderDto>> Update(int vehicleId, int id, ReminderRequest request, CancellationToken ct)
    {
        var vehicle = await FindVehicleAsync(vehicleId, ct);
        if (vehicle is null)
            return NotFound();

        var error = Validate(request, out var serviceType);
        if (error is not null)
            return ValidationProblem(error);

        var reminder = await Db.MaintenanceReminders.FirstOrDefaultAsync(r => r.Id == id && r.VehicleId == vehicleId, ct);
        if (reminder is null)
            return NotFound();

        ApplyRequest(reminder, request, serviceType);
        await Db.SaveChangesAsync(ct);

        return Ok(await EvaluateOneAsync(vehicle, reminder, ct));
    }

    [HttpDelete("vehicles/{vehicleId:int}/reminders/{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.Write)]
    public async Task<IActionResult> Delete(int vehicleId, int id, CancellationToken ct)
    {
        if (await FindVehicleAsync(vehicleId, ct) is null)
            return NotFound();

        var reminder = await Db.MaintenanceReminders.FirstOrDefaultAsync(r => r.Id == id && r.VehicleId == vehicleId, ct);
        if (reminder is null)
            return NotFound();

        Db.MaintenanceReminders.Remove(reminder);
        await Db.SaveChangesAsync(ct);

        return NoContent();
    }

    [HttpPost("vehicles/{vehicleId:int}/reminders/{id:int}/complete")]
    [Authorize(Policy = AuthorizationPolicies.Write)]
    public async Task<ActionResult<ReminderDto>> Complete(int vehicleId, int id, CompleteReminderRequest request, CancellationToken ct)
    {
        var vehicle = await FindVehicleAsync(vehicleId, ct);
        if (vehicle is null)
            return NotFound();

        if (request.Odometer < 0)
            return ValidationProblem("Odometer must not be negative.");
        if (!Enum.TryParse<ServicePerformedBy>(request.PerformedBy, ignoreCase: true, out var performedBy))
            return ValidationProblem($"Invalid performedBy '{request.PerformedBy}'.");

        var reminder = await Db.MaintenanceReminders.FirstOrDefaultAsync(r => r.Id == id && r.VehicleId == vehicleId, ct);
        if (reminder is null)
            return NotFound();

        Db.MaintenanceLogs.Add(new MaintenanceLog
        {
            VehicleId = vehicleId,
            ServiceDate = request.Date,
            OdometerReading = request.Odometer,
            PerformedBy = performedBy,
            Items =
            [
                new MaintenanceLogItem
                {
                    ServiceType = reminder.ServiceType,
                    Description = reminder.ServiceType == MaintenanceType.Other ? reminder.Name : null,
                },
            ],
        });

        reminder.LastDoneDate = request.Date;
        reminder.LastDoneOdometer = request.Odometer;
        reminder.SnoozedUntil = null;
        await Db.SaveChangesAsync(ct);

        return Ok(await EvaluateOneAsync(vehicle, reminder, ct));
    }

    [HttpPost("vehicles/{vehicleId:int}/reminders/{id:int}/snooze")]
    [Authorize(Policy = AuthorizationPolicies.Write)]
    public async Task<ActionResult<ReminderDto>> Snooze(int vehicleId, int id, SnoozeReminderRequest request, CancellationToken ct)
    {
        var vehicle = await FindVehicleAsync(vehicleId, ct);
        if (vehicle is null)
            return NotFound();

        var reminder = await Db.MaintenanceReminders.FirstOrDefaultAsync(r => r.Id == id && r.VehicleId == vehicleId, ct);
        if (reminder is null)
            return NotFound();

        reminder.SnoozedUntil = request.Until;
        await Db.SaveChangesAsync(ct);

        return Ok(await EvaluateOneAsync(vehicle, reminder, ct));
    }

    private Task<Vehicle?> FindVehicleAsync(int vehicleId, CancellationToken ct)
    {
        var ownerId = GetCurrentUserId();
        return Db.Vehicles.FirstOrDefaultAsync(v => v.Id == vehicleId && v.OwnerId == ownerId, ct);
    }

    private async Task<ReminderDto> EvaluateOneAsync(Vehicle vehicle, MaintenanceReminder reminder, CancellationToken ct)
    {
        var evaluated = await reminderService.EvaluateAsync(vehicle, [reminder], ct);
        return MapToDto(evaluated[0].Reminder, evaluated[0].Evaluation);
    }

    private static string? Validate(ReminderRequest request, out MaintenanceType serviceType)
    {
        if (!Enum.TryParse(request.ServiceType, ignoreCase: true, out serviceType))
            return $"Invalid serviceType '{request.ServiceType}'.";
        if (request.IntervalMiles is not > 0 && request.IntervalMonths is not > 0)
            return "A reminder needs an interval in miles, months, or both.";
        if (request.LeadMiles < 0 || request.LeadDays < 0)
            return "Lead times must not be negative.";
        if (request.IntervalMiles > MaxMiles || request.LeadMiles > MaxMiles)
            return $"Mileage values must not exceed {MaxMiles:N0}.";
        if (request.IntervalMonths > MaxIntervalMonths)
            return $"An interval must not exceed {MaxIntervalMonths:N0} months.";
        if (request.LeadDays > MaxLeadDays)
            return $"A lead time must not exceed {MaxLeadDays:N0} days.";
        return null;
    }

    private static void ApplyRequest(MaintenanceReminder reminder, ReminderRequest request, MaintenanceType serviceType)
    {
        reminder.ServiceType = serviceType;
        reminder.Name = string.IsNullOrWhiteSpace(request.Name)
            ? ReminderTemplates.Find(serviceType)?.Name ?? serviceType.ToString()
            : request.Name.Trim();
        reminder.IntervalMiles = request.IntervalMiles is > 0 ? request.IntervalMiles : null;
        reminder.IntervalMonths = request.IntervalMonths is > 0 ? request.IntervalMonths : null;
        reminder.LeadMiles = request.LeadMiles;
        reminder.LeadDays = request.LeadDays;
        reminder.IsActive = request.IsActive;
    }

    private static int StatusOrder(string status) => status switch
    {
        nameof(ReminderStatus.Overdue) => 0,
        nameof(ReminderStatus.DueSoon) => 1,
        nameof(ReminderStatus.Ok) => 2,
        _ => 3,
    };

    private static ReminderDto MapToDto(MaintenanceReminder r, ReminderEvaluation e) => new()
    {
        Id = r.Id,
        VehicleId = r.VehicleId,
        ServiceType = r.ServiceType.ToString(),
        Name = r.Name,
        IntervalMiles = r.IntervalMiles,
        IntervalMonths = r.IntervalMonths,
        LeadMiles = r.LeadMiles,
        LeadDays = r.LeadDays,
        IsActive = r.IsActive,
        SnoozedUntil = r.SnoozedUntil,
        Source = r.Source.ToString(),
        Status = e.Status.ToString(),
        LastServiceDate = e.Baseline.Date,
        LastServiceOdometer = e.Baseline.Odometer,
        NextDueOdometer = e.NextDueOdometer,
        NextDueDate = e.NextDueDate,
        EstimatedOdometer = e.Estimate.Odometer,
        IsOdometerEstimated = e.Estimate.IsEstimated,
        ProjectedDueDate = e.ProjectedDueDate,
    };
}
