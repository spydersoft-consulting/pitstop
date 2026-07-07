namespace Spydersoft.PitStop.Contracts.Analytics;

public class SummaryResponse
{
    public int VehicleId { get; set; }
    public int TotalFillUps { get; set; }
    public decimal TotalGallons { get; set; }
    public decimal TotalSpend { get; set; }
    public decimal TotalMiles { get; set; }
    public decimal? OverallMpg { get; set; }
    public decimal? RollingAvgMpg3 { get; set; }
    public decimal? RollingAvgMpg10 { get; set; }
    public decimal? AvgCostPerGallon { get; set; }
    public decimal? AvgCostPerMile { get; set; }
    public DateTimeOffset? LastFillUp { get; set; }
    public decimal? LastOdometer { get; set; }
}
