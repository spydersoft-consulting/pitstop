using Spydersoft.PitStop.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;

namespace Spydersoft.PitStop.Api.Controllers;

public abstract class PitStopControllerBase(PitStopDbContext db) : ControllerBase
{
    protected PitStopDbContext Db { get; } = db;

    protected string GetCurrentUserId() =>
        User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
        ?? throw new InvalidOperationException(
            "Authenticated request has no 'sub' claim. Endpoints requiring user identity must be guarded by an authorization policy that requires 'sub'.");

    protected Task<bool> VehicleExistsAsync(int vehicleId, string ownerId, CancellationToken ct) =>
        Db.Vehicles.AnyAsync(v => v.Id == vehicleId && v.OwnerId == ownerId, ct);
}
