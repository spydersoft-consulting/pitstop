namespace Spydersoft.PitStop.Contracts.Locations;

public class LocationSummaryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
}
