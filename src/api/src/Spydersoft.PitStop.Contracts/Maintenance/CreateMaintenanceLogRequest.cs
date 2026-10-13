using System.ComponentModel.DataAnnotations;
using Spydersoft.PitStop.Contracts.Locations;

namespace Spydersoft.PitStop.Contracts.Maintenance;

public class CreateMaintenanceLogRequest
{
    public CreateMaintenanceLogRequest()
    {
        ServiceDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    public DateOnly ServiceDate { get; set; }

    [Range(0, double.MaxValue)]
    public decimal OdometerReading { get; set; }

    /// <summary>Valid values: Self, Shop.</summary>
    [Required]
    public string PerformedBy { get; set; } = string.Empty;

    /// <summary>Attach an existing location owned by the caller. Mutually exclusive with <see cref="Location"/>.</summary>
    public int? LocationId { get; set; }

    /// <summary>Create (or reuse) a location inline. Mutually exclusive with <see cref="LocationId"/>.</summary>
    public CreateLocationRequest? Location { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    /// <summary>The individual services performed during this visit (at least one, at most 20).</summary>
    [Required]
    [MinLength(1)]
    [MaxLength(20)]
    public List<MaintenanceLogItemRequest> Items { get; set; } = [];
}
