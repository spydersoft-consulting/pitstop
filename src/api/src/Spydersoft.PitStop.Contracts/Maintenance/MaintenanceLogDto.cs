using Spydersoft.PitStop.Contracts.Locations;

namespace Spydersoft.PitStop.Contracts.Maintenance;

public class MaintenanceLogDto
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public DateOnly ServiceDate { get; set; }
    public decimal OdometerReading { get; set; }
    public string PerformedBy { get; set; } = string.Empty;
    public LocationSummaryDto? Location { get; set; }
    public string? Notes { get; set; }

    public List<MaintenanceLogItemDto> Items { get; set; } = [];
    public List<MaintenanceAttachmentDto> Attachments { get; set; } = [];

    // Computed: sum of item costs; null when no item has a cost
    public decimal? ComputedTotalCost { get; set; }
}
