using System.ComponentModel.DataAnnotations;
using Spydersoft.PitStop.Contracts.Locations;

namespace Spydersoft.PitStop.Contracts.Maintenance;

public class UpdateMaintenanceLogRequest
{
    public DateOnly ServiceDate { get; set; }

    [Range(0, double.MaxValue)]
    public decimal OdometerReading { get; set; }

    /// <summary>Valid values: OilChange, TireRotation, AirFilter, CabinFilter, BrakePads, BrakeFluid, SparkPlugs, Battery, WiperBlades, WasherFluid, Coolant, TransmissionFluid, Other.</summary>
    [Required]
    public string ServiceType { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Description { get; set; }

    /// <summary>Valid values: Self, Shop.</summary>
    [Required]
    public string PerformedBy { get; set; } = string.Empty;

    /// <summary>Attach an existing location owned by the caller. Mutually exclusive with <see cref="Location"/>.</summary>
    public int? LocationId { get; set; }

    /// <summary>Create (or reuse) a location inline. Mutually exclusive with <see cref="LocationId"/>.</summary>
    public CreateLocationRequest? Location { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? PartsCost { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? LaborCost { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? TotalCost { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? NextServiceOdometer { get; set; }

    public DateOnly? NextServiceDate { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }
}
