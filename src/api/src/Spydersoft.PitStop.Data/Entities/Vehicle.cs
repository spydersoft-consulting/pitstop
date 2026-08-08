namespace Spydersoft.PitStop.Data.Entities;

public class Vehicle
{
    public int Id { get; set; }
    public string OwnerId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Year { get; set; }
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string? Trim { get; set; }
    public decimal InitialOdometer { get; set; }
    public decimal? TankCapacityGallons { get; set; }
    public DateOnly StartDate { get; set; }
    public string? PlateState { get; set; }
    public string? PlateNumber { get; set; }
    public string? Vin { get; set; }
    public bool IsDeleted { get; set; }

    public ICollection<FillUp> FillUps { get; set; } = [];
    public ICollection<MaintenanceLog> MaintenanceLogs { get; set; } = [];
}
