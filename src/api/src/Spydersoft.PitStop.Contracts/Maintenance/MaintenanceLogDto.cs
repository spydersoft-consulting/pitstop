using Spydersoft.PitStop.Contracts.Locations;

namespace Spydersoft.PitStop.Contracts.Maintenance;

public class MaintenanceLogDto
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public DateOnly ServiceDate { get; set; }
    public decimal OdometerReading { get; set; }
    public string ServiceType { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string PerformedBy { get; set; } = string.Empty;
    public bool IsWarrantyWork { get; set; }
    public LocationSummaryDto? Location { get; set; }
    public decimal? PartsCost { get; set; }
    public decimal? LaborCost { get; set; }
    public decimal? TotalCost { get; set; }
    public string? Notes { get; set; }

    // Computed
    public decimal? ComputedTotalCost { get; set; }
}
