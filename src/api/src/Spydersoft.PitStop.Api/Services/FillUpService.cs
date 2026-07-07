using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Spydersoft.PitStop.Api.Services;

public class FillUpService(PitStopDbContext db)
{
    public async Task RecalculateComputedFieldsAsync(int vehicleId, CancellationToken ct = default)
    {
        var fillUps = await db.FillUps
            .Where(f => f.VehicleId == vehicleId)
            .OrderBy(f => f.OdometerReading)
            .ToListAsync(ct);

        FillUp? previous = null;
        foreach (var fillUp in fillUps)
        {
            if (previous is not null)
            {
                fillUp.MilesSinceLastFillUp = fillUp.OdometerReading - previous.OdometerReading;
                fillUp.MpgThisFillUp = fillUp.IsFullFillUp && fillUp.MilesSinceLastFillUp > 0
                    ? Math.Round(fillUp.MilesSinceLastFillUp.Value / fillUp.GallonsAdded, 2)
                    : null;
            }
            else
            {
                fillUp.MilesSinceLastFillUp = null;
                fillUp.MpgThisFillUp = null;
            }

            previous = fillUp;
        }

        await db.SaveChangesAsync(ct);
    }
}
