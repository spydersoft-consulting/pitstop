using Spydersoft.PitStop.Api.Services.Nhtsa;
using Spydersoft.PitStop.Contracts.Recalls;
using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Spydersoft.Notification.Contracts;

namespace Spydersoft.PitStop.Api.Jobs;

/// <summary>
/// Checks every vehicle with a VIN on file for open NHTSA recalls and sends a notification for
/// any recall the owner hasn't already been alerted about. Scoped (not the hosted service itself)
/// so it can be resolved per-tick from a DI scope, and so it's directly unit-testable.
/// </summary>
public class RecallCheckRunner(
    PitStopDbContext db,
    IVinDecoderClient vinDecoder,
    INhtsaRecallClient recallClient,
    INotificationClient notificationClient,
    ILogger<RecallCheckRunner> logger)
{
    public async Task RunAsync(CancellationToken ct = default)
    {
        var vehicles = await db.Vehicles
            .Where(v => v.Vin != null && v.Vin != "")
            .ToListAsync(ct);

        foreach (var vehicle in vehicles)
        {
            if (ct.IsCancellationRequested)
            {
                break;
            }

            await CheckVehicleAsync(vehicle, ct);
        }
    }

    private async Task CheckVehicleAsync(Vehicle vehicle, CancellationToken ct)
    {
        VinDecodeResult? decoded;
        try
        {
            decoded = await vinDecoder.DecodeAsync(vehicle.Vin!, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or InvalidOperationException)
        {
            logger.LogWarning(ex, "Unable to decode VIN for vehicle {VehicleId} during recall check", vehicle.Id);
            return;
        }

        if (decoded is null)
        {
            return;
        }

        IReadOnlyList<RecallDto> recalls;
        try
        {
            recalls = await recallClient.GetRecallsAsync(decoded.Make, decoded.Model, decoded.ModelYear, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or InvalidOperationException)
        {
            logger.LogWarning(ex, "Recall lookup failed for vehicle {VehicleId} during recall check", vehicle.Id);
            return;
        }

        if (recalls.Count == 0)
        {
            return;
        }

        var alreadyNotified = (await db.RecallNotifications
            .Where(r => r.VehicleId == vehicle.Id)
            .Select(r => r.CampaignNumber)
            .ToListAsync(ct))
            .ToHashSet();

        foreach (var recall in recalls)
        {
            if (alreadyNotified.Contains(recall.CampaignNumber))
            {
                continue;
            }

            await notificationClient.CreateAsync(new CreateNotificationRequest(
                UserId: vehicle.OwnerId,
                Source: "pitstop",
                Type: "recall-alert",
                Subject: $"Recall notice for your {vehicle.Year} {vehicle.Make} {vehicle.Model}",
                Body: $"NHTSA has issued recall {recall.CampaignNumber} affecting your vehicle: {recall.Summary}",
                Data: new Dictionary<string, string> { ["vehicleId"] = vehicle.Id.ToString(), ["recallId"] = recall.CampaignNumber },
                Priority: NotificationPriority.High,
                EntityType: "Vehicle",
                EntityId: vehicle.Id.ToString()), ct);

            db.RecallNotifications.Add(new RecallNotification
            {
                VehicleId = vehicle.Id,
                CampaignNumber = recall.CampaignNumber,
                NotifiedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync(ct);
        }
    }
}
