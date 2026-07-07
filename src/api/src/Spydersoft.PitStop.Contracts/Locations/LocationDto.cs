namespace Spydersoft.PitStop.Contracts.Locations;

public class LocationDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? GooglePlaceId { get; set; }
    public DateTimeOffset? LastUsedAt { get; set; }
    public int UseCount { get; set; }
}
