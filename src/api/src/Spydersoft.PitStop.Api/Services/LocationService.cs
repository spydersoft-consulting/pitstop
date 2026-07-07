using Spydersoft.PitStop.Contracts.Locations;
using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Spydersoft.PitStop.Api.Services;

public class LocationService(PitStopDbContext db)
{
    public async Task<Location> FindOrCreateAsync(
        string ownerId,
        CreateLocationRequest request,
        CancellationToken ct = default)
    {
        var name = request.Name.Trim();
        var address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();
        var lowerName = name.ToLower();
        var lowerAddress = address?.ToLower();

        var existing = await db.Locations
            .FirstOrDefaultAsync(l =>
                l.OwnerId == ownerId
                && l.Name.ToLower() == lowerName
                && (lowerAddress == null
                    ? l.Address == null
                    : l.Address != null && l.Address.ToLower() == lowerAddress),
                ct);

        if (existing is not null)
        {
            // Opportunistically backfill coords/place id if the existing row was missing them.
            existing.Latitude ??= request.Latitude;
            existing.Longitude ??= request.Longitude;
            existing.GooglePlaceId ??= request.GooglePlaceId;
            return existing;
        }

        var location = new Location
        {
            OwnerId = ownerId,
            Name = name,
            Address = address,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            GooglePlaceId = request.GooglePlaceId,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        db.Locations.Add(location);
        return location;
    }

    /// <summary>
    /// Resolves a fill-up's location attachment from request fields. Returns the location to
    /// attach (which may be null if neither field was provided) or an error message describing
    /// why the request was invalid.
    /// </summary>
    public async Task<(Location? Location, string? Error)> ResolveForFillUpAsync(
        string ownerId,
        int? locationId,
        CreateLocationRequest? inlineLocation,
        CancellationToken ct = default)
    {
        if (locationId.HasValue && inlineLocation is not null)
            return (null, "Provide either locationId or location, not both.");

        if (locationId.HasValue)
        {
            var existing = await db.Locations
                .FirstOrDefaultAsync(l => l.Id == locationId.Value && l.OwnerId == ownerId, ct);
            return existing is null
                ? (null, $"Location {locationId.Value} not found.")
                : (existing, null);
        }

        if (inlineLocation is not null)
            return (await FindOrCreateAsync(ownerId, inlineLocation, ct), null);

        return (null, null);
    }

    public static void TouchUsage(Location location, DateTimeOffset filledAt)
    {
        location.UseCount += 1;
        if (location.LastUsedAt is null || filledAt > location.LastUsedAt)
            location.LastUsedAt = filledAt;
    }

    public static void DecrementUsage(Location location)
    {
        if (location.UseCount > 0)
            location.UseCount -= 1;
    }
}
