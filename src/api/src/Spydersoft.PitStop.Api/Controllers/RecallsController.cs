using Spydersoft.PitStop.Api.Services.Nhtsa;
using Spydersoft.PitStop.Contracts.Recalls;
using Spydersoft.PitStop.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Spydersoft.PitStop.Api.Controllers;

[ApiController]
[Route("api/v1/vehicles/{vehicleId:int}/recalls")]
public class RecallsController(PitStopDbContext db, IVinDecoderClient vinDecoder, INhtsaRecallClient recallClient) : PitStopControllerBase(db)
{
    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.Read)]
    public async Task<ActionResult<List<RecallDto>>> GetAll(int vehicleId, CancellationToken ct)
    {
        var ownerId = GetCurrentUserId();
        var vehicle = await Db.Vehicles
            .FirstOrDefaultAsync(v => v.Id == vehicleId && v.OwnerId == ownerId, ct);

        if (vehicle is null)
            return NotFound();

        if (string.IsNullOrWhiteSpace(vehicle.Vin))
            return ValidationProblem("Vehicle does not have a VIN on file; recall lookup requires a VIN.");

        VinDecodeResult? decoded;
        try
        {
            decoded = await vinDecoder.DecodeAsync(vehicle.Vin, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or InvalidOperationException)
        {
            return RecallServiceUnavailable();
        }

        if (decoded is null)
            return ValidationProblem("Unable to decode the vehicle's VIN; recall lookup is unavailable for this vehicle.");

        try
        {
            var recalls = await recallClient.GetRecallsAsync(decoded.Make, decoded.Model, decoded.ModelYear, ct);
            return Ok(recalls);
        }
        catch (Exception ex) when (ex is HttpRequestException or InvalidOperationException)
        {
            return RecallServiceUnavailable();
        }
    }

    private ObjectResult RecallServiceUnavailable() =>
        Problem(detail: "The recall lookup service is currently unavailable. Please try again later.", statusCode: StatusCodes.Status502BadGateway);
}
