namespace Spydersoft.PitStop.Contracts.Maintenance;

public class MaintenanceLogItemDto
{
    public int Id { get; set; }
    public string ServiceType { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsWarrantyWork { get; set; }
    public decimal? PartsCost { get; set; }
    public decimal? LaborCost { get; set; }
    public decimal? TotalCost { get; set; }

    // Computed
    public decimal? ComputedTotalCost { get; set; }
}
