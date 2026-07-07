using System.ComponentModel.DataAnnotations;
using Spydersoft.PitStop.Contracts.Locations;

namespace Spydersoft.PitStop.Contracts.FillUps;

public class FillUpRequest
{
    public DateTimeOffset FilledAt { get; set; }

    [Range(0, double.MaxValue)]
    public decimal OdometerReading { get; set; }

    [Range(0.001, double.MaxValue)]
    public decimal GallonsAdded { get; set; }

    /// <summary>Valid values: Regular, MidGrade, Premium, Diesel, E85. Defaults to MidGrade if omitted.</summary>
    public string? FuelGrade { get; set; }

    [Range(0.001, double.MaxValue)]
    public decimal? PricePerGallon { get; set; }

    [Range(0.001, double.MaxValue)]
    public decimal? TotalCost { get; set; }

    public bool IsFullFillUp { get; set; } = true;

    /// <summary>Attach an existing location owned by the caller. Mutually exclusive with <see cref="Location"/>.</summary>
    public int? LocationId { get; set; }

    /// <summary>Create (or reuse) a location inline. Mutually exclusive with <see cref="LocationId"/>.</summary>
    public CreateLocationRequest? Location { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }
}
