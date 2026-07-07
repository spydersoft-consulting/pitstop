namespace Spydersoft.PitStop.Contracts.Analytics;

public class MpgOverTimeResponse
{
    public List<MpgDataPoint> Points { get; set; } = [];
}

public class MpgDataPoint
{
    public DateOnly Date { get; set; }
    public decimal OdometerReading { get; set; }
    public decimal? Mpg { get; set; }
    public decimal? RollingAvg { get; set; }
}
