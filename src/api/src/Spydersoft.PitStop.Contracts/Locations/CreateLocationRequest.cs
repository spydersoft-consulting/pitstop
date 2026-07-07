using System.ComponentModel.DataAnnotations;

namespace Spydersoft.PitStop.Contracts.Locations;

public class CreateLocationRequest
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Address { get; set; }

    [Range(-90.0, 90.0)]
    public double? Latitude { get; set; }

    [Range(-180.0, 180.0)]
    public double? Longitude { get; set; }

    [MaxLength(255)]
    public string? GooglePlaceId { get; set; }
}
