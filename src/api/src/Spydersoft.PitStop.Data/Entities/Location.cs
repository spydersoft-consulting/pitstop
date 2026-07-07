namespace Spydersoft.PitStop.Data.Entities;

public class Location
{
    public int Id { get; set; }
    public string OwnerId { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    public string? GooglePlaceId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? LastUsedAt { get; set; }
    public int UseCount { get; set; }

    public bool IsDeleted { get; set; }

    public ICollection<FillUp> FillUps { get; set; } = [];
}
