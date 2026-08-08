using System.ComponentModel.DataAnnotations;

namespace Spydersoft.PitStop.Contracts.Vehicles;

public class CreateVehicleRequest
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

    [Range(0, double.MaxValue)]
    public decimal InitialOdometer { get; set; }

    [Range(0.1, 200.0)]
    public decimal? TankCapacityGallons { get; set; }

    public DateOnly StartDate { get; set; }

    [MaxLength(2)]
    public string? PlateState { get; set; }

    [MaxLength(20)]
    public string? PlateNumber { get; set; }

    [RegularExpression("^[A-HJ-NPR-Z0-9]{17}$", ErrorMessage = "VIN must be 17 characters (letters and digits, excluding I, O, and Q).")]
    public string? Vin { get; set; }
}
