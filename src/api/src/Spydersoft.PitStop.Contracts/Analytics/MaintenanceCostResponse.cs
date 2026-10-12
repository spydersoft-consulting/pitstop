namespace Spydersoft.PitStop.Contracts.Analytics;

public class MaintenanceCostResponse
{
    public List<MaintenanceCostDataPoint> Points { get; set; } = [];
}

public class MaintenanceCostDataPoint
{
    public string ServiceType { get; set; } = string.Empty;
    public int Count { get; set; }
    public int WarrantyCount { get; set; }

    /// <summary>Sum of each item's cost, using its total override when set, otherwise parts + labor.</summary>
    public decimal TotalCost { get; set; }
    public decimal PartsCost { get; set; }
    public decimal LaborCost { get; set; }
}
