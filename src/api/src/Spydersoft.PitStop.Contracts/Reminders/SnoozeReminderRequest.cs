namespace Spydersoft.PitStop.Contracts.Reminders;

public class SnoozeReminderRequest
{
    /// <summary>Notifications are suppressed through this date; null clears the snooze.</summary>
    public DateOnly? Until { get; set; }
}
