namespace Spydersoft.PitStop.Data.Entities;

public enum ReminderSource
{
    User = 0,
    Template = 1,
    Provider = 2,
}

public enum ReminderStage
{
    Approaching = 0,
    Overdue = 1,
}

/// <summary>
/// An owner-defined recurring service interval for one vehicle: every N miles, every N months,
/// or whichever comes first. Next-due and status are computed from this plus the vehicle's
/// maintenance logs and odometer readings; they are not stored.
/// </summary>
public class MaintenanceReminder
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public Vehicle Vehicle { get; set; } = null!;

    public MaintenanceType ServiceType { get; set; }
    public string Name { get; set; } = string.Empty;

    public decimal? IntervalMiles { get; set; }
    public int? IntervalMonths { get; set; }
    public decimal? LeadMiles { get; set; }
    public int? LeadDays { get; set; }

    public bool IsActive { get; set; } = true;
    public DateOnly? SnoozedUntil { get; set; }

    public DateOnly? LastDoneDate { get; set; }
    public decimal? LastDoneOdometer { get; set; }

    public ReminderSource Source { get; set; }

    public List<ReminderNotification> Notifications { get; set; } = [];
}
