namespace Spydersoft.PitStop.Contracts.Reminders;

/// <summary>
/// One past completion of a reminder's service, measured against the reminder's current interval
/// from the previous completion. The first completion has no due values because there is no
/// earlier service to measure from.
/// </summary>
public class ReminderHistoryEntryDto
{
    public int MaintenanceLogId { get; set; }
    public DateOnly ServiceDate { get; set; }
    public decimal Odometer { get; set; }
    public DateOnly? DueDate { get; set; }
    public decimal? DueOdometer { get; set; }
    public int? DaysLate { get; set; }
    public decimal? MilesOver { get; set; }
    public bool WasLate { get; set; }
}
