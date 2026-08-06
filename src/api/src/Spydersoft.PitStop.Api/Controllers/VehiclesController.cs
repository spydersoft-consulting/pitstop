using Spydersoft.PitStop.Contracts.Vehicles;
using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Spydersoft.PitStop.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class VehiclesController(PitStopDbContext db) : PitStopControllerBase(db)
{
    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.Read)]
    public async Task<ActionResult<List<VehicleDto>>> GetAll(CancellationToken ct)
    {
        var ownerId = GetCurrentUserId();
        var vehicles = await Db.Vehicles
            .Where(v => v.OwnerId == ownerId)
            .OrderBy(v => v.Name)
            .Select(v => MapToDto(v))
            .ToListAsync(ct);

        return Ok(vehicles);
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.Read)]
    public async Task<ActionResult<VehicleDto>> GetById(int id, CancellationToken ct)
    {
        var ownerId = GetCurrentUserId();
        var vehicle = await Db.Vehicles
            .FirstOrDefaultAsync(v => v.Id == id && v.OwnerId == ownerId, ct);

        return vehicle is null ? NotFound() : Ok(MapToDto(vehicle));
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.Write)]
    public async Task<ActionResult<VehicleDto>> Create(CreateVehicleRequest request, CancellationToken ct)
    {
        var vehicle = new Vehicle
        {
            OwnerId = GetCurrentUserId(),
            Name = request.Name,
            Year = request.Year,
            Make = request.Make,
            Model = request.Model,
            Trim = request.Trim,
            InitialOdometer = request.InitialOdometer,
            TankCapacityGallons = request.TankCapacityGallons,
            StartDate = request.StartDate,
            PlateState = request.PlateState,
            PlateNumber = request.PlateNumber
        };

        Db.Vehicles.Add(vehicle);
        await Db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = vehicle.Id }, MapToDto(vehicle));
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.Write)]
    public async Task<ActionResult<VehicleDto>> Update(int id, UpdateVehicleRequest request, CancellationToken ct)
    {
        var ownerId = GetCurrentUserId();
        var vehicle = await Db.Vehicles
            .FirstOrDefaultAsync(v => v.Id == id && v.OwnerId == ownerId, ct);

        if (vehicle is null)
            return NotFound();

        vehicle.Name = request.Name;
        vehicle.Year = request.Year;
        vehicle.Make = request.Make;
        vehicle.Model = request.Model;
        vehicle.Trim = request.Trim;
        vehicle.TankCapacityGallons = request.TankCapacityGallons;
        vehicle.PlateState = request.PlateState;
        vehicle.PlateNumber = request.PlateNumber;

        await Db.SaveChangesAsync(ct);
        return Ok(MapToDto(vehicle));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.Write)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var ownerId = GetCurrentUserId();
        var vehicle = await Db.Vehicles
            .FirstOrDefaultAsync(v => v.Id == id && v.OwnerId == ownerId, ct);

        if (vehicle is null)
            return NotFound();

        vehicle.IsDeleted = true;
        await Db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static VehicleDto MapToDto(Vehicle v) => new()
    {
        Id = v.Id,
        Name = v.Name,
        Year = v.Year,
        Make = v.Make,
        Model = v.Model,
        Trim = v.Trim,
        InitialOdometer = v.InitialOdometer,
        TankCapacityGallons = v.TankCapacityGallons,
        StartDate = v.StartDate,
        PlateState = v.PlateState,
        PlateNumber = v.PlateNumber
    };
}
