using System.ComponentModel.DataAnnotations;

namespace Spydersoft.PitStop.Contracts.Vehicles;

public class UpdateVehicleRequest
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Range(1900, 2100)]
    public int Year { get; set; }

    [Required, MaxLength(50)]
    public string Make { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string Model { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? Trim { get; set; }

    [Range(0.1, 200.0)]
    public decimal? TankCapacityGallons { get; set; }
}
