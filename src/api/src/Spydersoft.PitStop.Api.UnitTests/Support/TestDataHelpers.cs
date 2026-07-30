using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.Data.Entities;

namespace Spydersoft.PitStop.Api.UnitTests.Support;

internal static class TestDataHelpers
{
    public const string TestUserId = "test-user";

    public static ControllerContext BuildControllerContext(string? subClaim)
    {
        var identity = subClaim is null
            ? new ClaimsIdentity()
            : new ClaimsIdentity([new Claim(JwtRegisteredClaimNames.Sub, subClaim)], "Test");

        return new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
    }

    public static async Task<Vehicle> CreateVehicleAsync(PitStopDbContext db, string ownerId = TestUserId)
    {
        var vehicle = new Vehicle
        {
            OwnerId = ownerId,
            Name = "Test Bronco",
            Year = 2024,
            Make = "Ford",
            Model = "Bronco",
            StartDate = new DateOnly(2024, 1, 1)
        };
        db.Vehicles.Add(vehicle);
        await db.SaveChangesAsync();
        return vehicle;
    }

    public static async Task<Location> CreateLocationAsync(
        PitStopDbContext db,
        string name = "Test Location",
        string? address = null,
        string ownerId = TestUserId,
        int useCount = 0,
        DateTimeOffset? lastUsedAt = null)
    {
        var location = new Location
        {
            OwnerId = ownerId,
            Name = name,
            Address = address,
            CreatedAt = DateTimeOffset.UtcNow,
            UseCount = useCount,
            LastUsedAt = lastUsedAt,
        };
        db.Locations.Add(location);
        await db.SaveChangesAsync();
        return location;
    }
}
