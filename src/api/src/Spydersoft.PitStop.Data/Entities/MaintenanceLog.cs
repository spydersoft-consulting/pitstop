namespace Spydersoft.PitStop.Data.Entities;

public class MaintenanceLog
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public Vehicle Vehicle { get; set; } = null!;

    public DateOnly ServiceDate { get; set; }
    public decimal OdometerReading { get; set; }
    public MaintenanceType ServiceType { get; set; }
    public string? Description { get; set; }
    public ServicePerformedBy PerformedBy { get; set; }

    public int? LocationId { get; set; }
    public Location? Location { get; set; }

    public decimal? PartsCost { get; set; }
    public decimal? LaborCost { get; set; }
    public decimal? TotalCost { get; set; }

    public decimal? NextServiceOdometer { get; set; }
    public DateOnly? NextServiceDate { get; set; }

    public string? Notes { get; set; }

    public bool IsDeleted { get; set; }
}
