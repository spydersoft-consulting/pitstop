using Spydersoft.PitStop.Api.Services;
using Spydersoft.PitStop.Contracts.Locations;
using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Spydersoft.PitStop.Api.Controllers;

[ApiController]
[Route("api/v1/locations")]
public class LocationsController(PitStopDbContext db, LocationService locationService)
    : PitStopControllerBase(db)
{
    private const string OrderByName = "name";
    private const int MaxLimit = 50;

    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.Read)]
    public async Task<ActionResult<List<LocationDto>>> GetAll(
        [FromQuery] LocationListQuery listQuery,
        CancellationToken ct = default)
    {
        var ownerId = GetCurrentUserId();
        var limit = Math.Clamp(listQuery.Limit, 1, MaxLimit);

        var query = Db.Locations.Where(l => l.OwnerId == ownerId);

        if (!string.IsNullOrWhiteSpace(listQuery.Search))
        {
            var search = listQuery.Search.Trim().ToLower();
            query = query.Where(l =>
                l.Name.ToLower().Contains(search)
                || (l.Address != null && l.Address.ToLower().Contains(search)));
        }

        query = listQuery.OrderBy.ToLowerInvariant() switch
        {
            OrderByName => query.OrderBy(l => l.Name),
            _ => query.OrderByDescending(l => l.LastUsedAt).ThenByDescending(l => l.UseCount),
        };

        var items = await query
            .Take(limit)
            .Select(l => MapToDto(l))
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.Read)]
    public async Task<ActionResult<LocationDto>> GetById(int id, CancellationToken ct)
    {
        var ownerId = GetCurrentUserId();
        var location = await Db.Locations
            .FirstOrDefaultAsync(l => l.Id == id && l.OwnerId == ownerId, ct);

        return location is null ? NotFound() : Ok(MapToDto(location));
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.Write)]
    public async Task<ActionResult<LocationDto>> Create(
        CreateLocationRequest request,
        CancellationToken ct)
    {
        var ownerId = GetCurrentUserId();
        var location = await locationService.FindOrCreateAsync(ownerId, request, ct);
        await Db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = location.Id }, MapToDto(location));
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.Write)]
    public async Task<ActionResult<LocationDto>> Update(
        int id,
        UpdateLocationRequest request,
        CancellationToken ct)
    {
        var ownerId = GetCurrentUserId();
        var location = await Db.Locations
            .FirstOrDefaultAsync(l => l.Id == id && l.OwnerId == ownerId, ct);

        if (location is null) return NotFound();

        location.Name = request.Name;
        location.Address = request.Address;
        location.Latitude = request.Latitude;
        location.Longitude = request.Longitude;
        location.GooglePlaceId = request.GooglePlaceId;

        await Db.SaveChangesAsync(ct);
        return Ok(MapToDto(location));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.Write)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var ownerId = GetCurrentUserId();
        var location = await Db.Locations
            .FirstOrDefaultAsync(l => l.Id == id && l.OwnerId == ownerId, ct);

        if (location is null) return NotFound();

        Db.Locations.Remove(location);
        await Db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static LocationDto MapToDto(Location l) => new()
    {
        Id = l.Id,
        Name = l.Name,
        Address = l.Address,
        Latitude = l.Latitude,
        Longitude = l.Longitude,
        GooglePlaceId = l.GooglePlaceId,
        LastUsedAt = l.LastUsedAt,
        UseCount = l.UseCount,
    };
}
