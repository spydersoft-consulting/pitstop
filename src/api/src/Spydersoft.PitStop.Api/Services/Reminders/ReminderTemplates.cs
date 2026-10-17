using Spydersoft.PitStop.Data.Entities;

namespace Spydersoft.PitStop.Api.Services.Reminders;

public record ReminderTemplate(
    MaintenanceType ServiceType,
    string Name,
    decimal? IntervalMiles,
    int? IntervalMonths,
    decimal? LeadMiles,
    int? LeadDays);

/// <summary>Typical service intervals offered as starting points; owners adjust them per vehicle.</summary>
public static class ReminderTemplates
{
    public static IReadOnlyList<ReminderTemplate> All { get; } =
    [
        new(MaintenanceType.OilChange, "Oil change", 5000, 6, 500, 14),
        new(MaintenanceType.TireRotation, "Tire rotation", 6000, 6, 500, 14),
        new(MaintenanceType.AirFilter, "Engine air filter", 15000, 12, 1000, 30),
        new(MaintenanceType.CabinFilter, "Cabin air filter", 15000, 12, 1000, 30),
        new(MaintenanceType.BrakeFluid, "Brake fluid", null, 24, null, 30),
        new(MaintenanceType.SparkPlugs, "Spark plugs", 60000, null, 3000, null),
        new(MaintenanceType.Coolant, "Coolant", 50000, 60, 3000, 60),
        new(MaintenanceType.TransmissionFluid, "Transmission fluid", 60000, 60, 3000, 60),
        new(MaintenanceType.Battery, "Battery", null, 48, null, 60),
        new(MaintenanceType.WiperBlades, "Wiper blades", null, 12, null, 30),
    ];

    public static ReminderTemplate? Find(MaintenanceType type) => All.FirstOrDefault(t => t.ServiceType == type);
}
