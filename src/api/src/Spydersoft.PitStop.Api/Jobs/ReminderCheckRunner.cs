using Microsoft.EntityFrameworkCore;
using Spydersoft.Notification.Contracts;
using Spydersoft.PitStop.Api.Services.Reminders;
using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.Data.Entities;

namespace Spydersoft.PitStop.Api.Jobs;

/// <summary>
/// Evaluates every active maintenance reminder and notifies the owner once per service cycle when
/// a reminder becomes due soon and again when it becomes overdue. Scoped so it can be resolved
/// per-tick from a DI scope and unit-tested directly.
/// </summary>
public class ReminderCheckRunner(
    PitStopDbContext db,
    ReminderService reminderService,
    INotificationClient notificationClient,
    TimeProvider timeProvider,
    ILogger<ReminderCheckRunner> logger)
{
    public async Task RunAsync(CancellationToken ct = default)
    {
        var reminders = await db.MaintenanceReminders
            .Include(r => r.Vehicle)
            .Where(r => r.IsActive)
            .ToListAsync(ct);

        foreach (var group in reminders.GroupBy(r => r.VehicleId))
        {
            if (ct.IsCancellationRequested)
            {
                break;
            }

            try
            {
                await CheckVehicleAsync(group.First().Vehicle, group.ToList(), ct);
            }
            catch (Exception ex) when (ex is HttpRequestException or InvalidOperationException)
            {
                logger.LogWarning(ex, "Reminder check failed for vehicle {VehicleId}", group.Key);
            }
        }
    }

    private async Task CheckVehicleAsync(Vehicle vehicle, List<MaintenanceReminder> reminders, CancellationToken ct)
    {
        var evaluated = await reminderService.EvaluateAsync(vehicle, reminders, ct);

        foreach (var (reminder, evaluation) in evaluated)
        {
            var stage = evaluation.Status switch
            {
                ReminderStatus.DueSoon => ReminderStage.Approaching,
                ReminderStatus.Overdue => ReminderStage.Overdue,
                _ => (ReminderStage?)null,
            };

            if (stage is null)
            {
                continue;
            }

            var cycleKey = evaluation.Baseline.CycleKey;
            var alreadyNotified = await db.ReminderNotifications
                .AnyAsync(n => n.ReminderId == reminder.Id && n.Stage == stage && n.CycleKey == cycleKey, ct);
            if (alreadyNotified)
            {
                continue;
            }

            var ledger = new ReminderNotification
            {
                ReminderId = reminder.Id,
                Stage = stage.Value,
                CycleKey = cycleKey,
                NotifiedAt = timeProvider.GetUtcNow(),
            };
            db.ReminderNotifications.Add(ledger);

            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException)
            {
                db.Entry(ledger).State = EntityState.Detached;
                continue;
            }

            try
            {
                await notificationClient.CreateAsync(BuildRequest(vehicle, reminder, evaluation, stage.Value), ct);
            }
            catch
            {
                db.ReminderNotifications.Remove(ledger);
                await db.SaveChangesAsync(CancellationToken.None);
                throw;
            }
        }
    }

    private static CreateNotificationRequest BuildRequest(
        Vehicle vehicle, MaintenanceReminder reminder, ReminderEvaluation evaluation, ReminderStage stage)
    {
        var vehicleName = $"{vehicle.Year} {vehicle.Make} {vehicle.Model}";
        var subject = stage == ReminderStage.Overdue
            ? $"{reminder.Name} is overdue for your {vehicleName}"
            : $"{reminder.Name} is coming due for your {vehicleName}";

        var due = new List<string>();
        if (evaluation.NextDueOdometer.HasValue)
            due.Add($"{evaluation.NextDueOdometer:N0} miles");
        if (evaluation.NextDueDate.HasValue)
            due.Add($"{evaluation.NextDueDate:MMM d, yyyy}");

        return new CreateNotificationRequest(
            UserId: vehicle.OwnerId,
            Source: "pitstop",
            Type: "maintenance-due",
            Subject: subject,
            Body: $"Last done {evaluation.Baseline.Date:MMM d, yyyy} at {evaluation.Baseline.Odometer:N0} miles. Due at {string.Join(" or ", due)}.",
            Data: new Dictionary<string, string>
            {
                ["vehicleId"] = vehicle.Id.ToString(),
                ["reminderId"] = reminder.Id.ToString(),
            },
            Priority: NotificationPriority.Normal,
            EntityType: "Vehicle",
            EntityId: vehicle.Id.ToString());
    }
}
