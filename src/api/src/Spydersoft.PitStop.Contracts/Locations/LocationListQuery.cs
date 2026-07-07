namespace Spydersoft.PitStop.Contracts.Locations;

public class LocationListQuery
{
    public string? Search { get; set; }
    public int Limit { get; set; } = 10;
    public string OrderBy { get; set; } = "recent";
}
