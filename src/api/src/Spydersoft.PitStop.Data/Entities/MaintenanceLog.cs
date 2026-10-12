namespace Spydersoft.PitStop.Data.Entities;

public class MaintenanceLog
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public Vehicle Vehicle { get; set; } = null!;

    public DateOnly ServiceDate { get; set; }
    public decimal OdometerReading { get; set; }
    public ServicePerformedBy PerformedBy { get; set; }

    public int? LocationId { get; set; }
    public Location? Location { get; set; }

    public string? Notes { get; set; }

    public bool IsDeleted { get; set; }

    public List<MaintenanceLogItem> Items { get; set; } = [];
    public List<MaintenanceLogAttachment> Attachments { get; set; } = [];
}
