namespace Spydersoft.PitStop.Data.Entities;

/// <summary>
/// Records that a maintenance-due notification has been sent for a reminder at a given stage
/// within a service cycle. The cycle key changes when the service is performed, so the next
/// cycle notifies again.
/// </summary>
public class ReminderNotification
{
    public int Id { get; set; }
    public int ReminderId { get; set; }
    public ReminderStage Stage { get; set; }
    public string CycleKey { get; set; } = string.Empty;
    public DateTimeOffset NotifiedAt { get; set; }

    public MaintenanceReminder Reminder { get; set; } = null!;
}
