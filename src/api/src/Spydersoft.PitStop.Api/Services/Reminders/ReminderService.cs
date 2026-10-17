using Microsoft.EntityFrameworkCore;
using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.Data.Entities;

namespace Spydersoft.PitStop.Api.Services.Reminders;

/// <summary>Loads a vehicle's service history and evaluates its reminders against it.</summary>
public class ReminderService(PitStopDbContext db, TimeProvider timeProvider)
{
    public DateOnly Today => DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);

    /// <summary>Past completions of the reminder's service, newest first, with lateness against its current interval.</summary>
    public async Task<IReadOnlyList<ReminderHistoryEntry>> HistoryAsync(
        MaintenanceReminder reminder,
        CancellationToken ct)
    {
        if (reminder.ServiceType == MaintenanceType.Other)
        {
            return [];
        }

        var completions = await db.MaintenanceLogs
            .Where(m => m.VehicleId == reminder.VehicleId && m.Items.Any(i => i.ServiceType == reminder.ServiceType))
            .Select(m => new ReminderCompletion(m.Id, m.ServiceDate, m.OdometerReading))
            .ToListAsync(ct);

        return ReminderCalculator.BuildHistory(reminder, completions).Reverse().ToList();
    }

    public async Task<IReadOnlyList<(MaintenanceReminder Reminder, ReminderEvaluation Evaluation)>> EvaluateAsync(
        Vehicle vehicle,
        IReadOnlyCollection<MaintenanceReminder> reminders,
        CancellationToken ct)
    {
        if (reminders.Count == 0)
        {
            return [];
        }

        var logs = await db.MaintenanceLogs
            .Where(m => m.VehicleId == vehicle.Id)
            .Select(m => new { m.ServiceDate, m.OdometerReading, Types = m.Items.Select(i => i.ServiceType).ToList() })
            .ToListAsync(ct);

        var fillUps = await db.FillUps
            .Where(f => f.VehicleId == vehicle.Id)
            .Select(f => new { f.FilledAt, f.OdometerReading })
            .ToListAsync(ct);

        var samples = new List<OdometerSample> { new(vehicle.StartDate, vehicle.InitialOdometer) };
        samples.AddRange(logs.Select(l => new OdometerSample(l.ServiceDate, l.OdometerReading)));
        samples.AddRange(fillUps.Select(f => new OdometerSample(DateOnly.FromDateTime(f.FilledAt.UtcDateTime), f.OdometerReading)));

        var today = Today;
        var estimate = ReminderCalculator.EstimateOdometer(samples, today);

        return reminders.Select(reminder =>
        {
            var matching = reminder.ServiceType == MaintenanceType.Other
                ? []
                : logs.Where(l => l.Types.Contains(reminder.ServiceType))
                    .Select(l => new OdometerSample(l.ServiceDate, l.OdometerReading));

            var baseline = ReminderCalculator.ChooseBaseline(
                matching, reminder.LastDoneDate, reminder.LastDoneOdometer, vehicle.StartDate, vehicle.InitialOdometer);

            return (reminder, ReminderCalculator.Evaluate(reminder, baseline, estimate, today));
        }).ToList();
    }
}
