namespace Spydersoft.PitStop.Contracts.Analytics;

public class SpendResponse
{
    public List<SpendDataPoint> Points { get; set; } = [];
}

public class SpendDataPoint
{
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal TotalSpend { get; set; }
    public decimal TotalGallons { get; set; }
    public int FillUpCount { get; set; }
}
