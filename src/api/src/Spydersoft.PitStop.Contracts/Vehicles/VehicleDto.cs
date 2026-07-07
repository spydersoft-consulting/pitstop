namespace Spydersoft.PitStop.Contracts.Vehicles;

public class VehicleDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Year { get; set; }
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string? Trim { get; set; }
    public decimal InitialOdometer { get; set; }
    public decimal? TankCapacityGallons { get; set; }
    public DateOnly StartDate { get; set; }
}
