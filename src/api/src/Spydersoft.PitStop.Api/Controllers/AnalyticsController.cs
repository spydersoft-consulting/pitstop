using Spydersoft.PitStop.Contracts.Analytics;
using Spydersoft.PitStop.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Spydersoft.PitStop.Api.Controllers;

[ApiController]
[Route("api/v1/vehicles/{vehicleId:int}/analytics")]
[Authorize(Policy = AuthorizationPolicies.Read)]
public class AnalyticsController(PitStopDbContext db) : PitStopControllerBase(db)
{
    [HttpGet("summary")]
    public async Task<ActionResult<SummaryResponse>> GetSummary(int vehicleId, CancellationToken ct)
    {
        if (!await VehicleExistsAsync(vehicleId, GetCurrentUserId(), ct))
            return NotFound();

        var fillUps = await Db.FillUps
            .Where(f => f.VehicleId == vehicleId)
            .OrderByDescending(f => f.FilledAt)
            .ToListAsync(ct);

        if (fillUps.Count == 0)
            return Ok(new SummaryResponse { VehicleId = vehicleId });

        var mpgValues = fillUps
            .Where(f => f.MpgThisFillUp.HasValue)
            .Select(f => f.MpgThisFillUp!.Value)
            .ToList();

        var miledFillUps = fillUps.Where(f => f.MilesSinceLastFillUp > 0).ToList();
        decimal? avgCostPerMile = miledFillUps.Count > 0
            ? Math.Round(miledFillUps.Sum(f => f.TotalCost) / miledFillUps.Sum(f => f.MilesSinceLastFillUp!.Value), 3)
            : null;

        return Ok(new SummaryResponse
        {
            VehicleId = vehicleId,
            TotalFillUps = fillUps.Count,
            TotalGallons = fillUps.Sum(f => f.GallonsAdded),
            TotalSpend = fillUps.Sum(f => f.TotalCost),
            TotalMiles = miledFillUps.Sum(f => f.MilesSinceLastFillUp!.Value),
            OverallMpg = mpgValues.Count > 0 ? Math.Round(mpgValues.Average(), 2) : null,
            RollingAvgMpg3 = mpgValues.Count >= 3 ? Math.Round(mpgValues.Take(3).Average(), 2) : null,
            RollingAvgMpg10 = mpgValues.Count >= 10 ? Math.Round(mpgValues.Take(10).Average(), 2) : null,
            AvgCostPerGallon = Math.Round(fillUps.Average(f => f.PricePerGallon), 3),
            AvgCostPerMile = avgCostPerMile,
            LastFillUp = fillUps[0].FilledAt,
            LastOdometer = fillUps[0].OdometerReading
        });
    }

    [HttpGet("mpg")]
    public async Task<ActionResult<MpgOverTimeResponse>> GetMpgOverTime(int vehicleId, CancellationToken ct)
    {
        if (!await VehicleExistsAsync(vehicleId, GetCurrentUserId(), ct))
            return NotFound();

        var fillUps = await Db.FillUps
            .Where(f => f.VehicleId == vehicleId && f.MpgThisFillUp.HasValue)
            .OrderBy(f => f.FilledAt)
            .ToListAsync(ct);

        var points = new List<MpgDataPoint>(fillUps.Count);
        var window = new Queue<decimal>(10);
        decimal windowSum = 0;

        foreach (var f in fillUps)
        {
            if (window.Count == 10)
                windowSum -= window.Dequeue();
            window.Enqueue(f.MpgThisFillUp!.Value);
            windowSum += f.MpgThisFillUp!.Value;

            points.Add(new MpgDataPoint
            {
                Date = DateOnly.FromDateTime(f.FilledAt.LocalDateTime),
                OdometerReading = f.OdometerReading,
                Mpg = f.MpgThisFillUp,
                RollingAvg = window.Count >= 3
                    ? Math.Round(windowSum / window.Count, 2)
                    : null
            });
        }

        return Ok(new MpgOverTimeResponse { Points = points });
    }

    [HttpGet("spend")]
    public async Task<ActionResult<SpendResponse>> GetSpend(int vehicleId, CancellationToken ct)
    {
        if (!await VehicleExistsAsync(vehicleId, GetCurrentUserId(), ct))
            return NotFound();

        var points = await Db.FillUps
            .Where(f => f.VehicleId == vehicleId)
            .GroupBy(f => new { f.FilledAt.Year, f.FilledAt.Month })
            .Select(g => new SpendDataPoint
            {
                Year = g.Key.Year,
                Month = g.Key.Month,
                TotalSpend = g.Sum(f => f.TotalCost),
                TotalGallons = g.Sum(f => f.GallonsAdded),
                FillUpCount = g.Count()
            })
            .OrderBy(p => p.Year).ThenBy(p => p.Month)
            .ToListAsync(ct);

        return Ok(new SpendResponse { Points = points });
    }
}
