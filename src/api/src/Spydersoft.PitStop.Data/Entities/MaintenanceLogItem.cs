namespace Spydersoft.PitStop.Data.Entities;

public class MaintenanceLogItem
{
    public int Id { get; set; }
    public int MaintenanceLogId { get; set; }
    public MaintenanceLog MaintenanceLog { get; set; } = null!;

    public MaintenanceType ServiceType { get; set; }
    public string? Description { get; set; }
    public bool IsWarrantyWork { get; set; }

    public decimal? PartsCost { get; set; }
    public decimal? LaborCost { get; set; }
    public decimal? TotalCost { get; set; }
}
