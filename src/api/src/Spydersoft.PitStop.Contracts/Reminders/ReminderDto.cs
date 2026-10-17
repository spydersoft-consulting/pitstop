namespace Spydersoft.PitStop.Contracts.Reminders;

public class ReminderDto
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public string ServiceType { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal? IntervalMiles { get; set; }
    public int? IntervalMonths { get; set; }
    public decimal? LeadMiles { get; set; }
    public int? LeadDays { get; set; }
    public bool IsActive { get; set; }
    public DateOnly? SnoozedUntil { get; set; }
    public string Source { get; set; } = string.Empty;

    /// <summary>Ok, DueSoon, Overdue or Snoozed.</summary>
    public string Status { get; set; } = string.Empty;

    public DateOnly LastServiceDate { get; set; }
    public decimal LastServiceOdometer { get; set; }
    public decimal? NextDueOdometer { get; set; }
    public DateOnly? NextDueDate { get; set; }
    public decimal EstimatedOdometer { get; set; }
    public bool IsOdometerEstimated { get; set; }

    /// <summary>For mileage-based reminders, when the due odometer is projected to be reached.</summary>
    public DateOnly? ProjectedDueDate { get; set; }
}
