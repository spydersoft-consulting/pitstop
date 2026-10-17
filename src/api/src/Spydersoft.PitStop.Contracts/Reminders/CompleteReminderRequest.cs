namespace Spydersoft.PitStop.Contracts.Reminders;

public class CompleteReminderRequest
{
    public DateOnly Date { get; set; }
    public decimal Odometer { get; set; }
    public string PerformedBy { get; set; } = "Self";
}
