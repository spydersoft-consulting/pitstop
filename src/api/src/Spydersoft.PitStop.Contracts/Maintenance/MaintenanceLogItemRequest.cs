using System.ComponentModel.DataAnnotations;

namespace Spydersoft.PitStop.Contracts.Maintenance;

public class MaintenanceLogItemRequest
{
    /// <summary>Valid values: OilChange, TireRotation, AirFilter, CabinFilter, BrakePads, BrakeFluid, SparkPlugs, Battery, WiperBlades, WasherFluid, Coolant, TransmissionFluid, Other, Recall.</summary>
    [Required]
    public string ServiceType { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Description { get; set; }

    public bool IsWarrantyWork { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? PartsCost { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? LaborCost { get; set; }

    /// <summary>Overrides the sum of parts and labor when provided.</summary>
    [Range(0, double.MaxValue)]
    public decimal? TotalCost { get; set; }
}
