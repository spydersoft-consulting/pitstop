using Microsoft.Extensions.Caching.Memory;
using Spydersoft.PitStop.Contracts.Recalls;

namespace Spydersoft.PitStop.Api.Services.Nhtsa;

public class NhtsaRecallClient(HttpClient httpClient, IMemoryCache cache, IConfiguration configuration) : INhtsaRecallClient
{
    private static readonly TimeSpan DefaultCacheDuration = TimeSpan.FromHours(24);

    public async Task<IReadOnlyList<RecallDto>> GetRecallsAsync(string make, string model, int modelYear, CancellationToken ct = default)
    {
        var cacheKey = $"nhtsa-recalls:{make.Trim().ToLowerInvariant()}:{model.Trim().ToLowerInvariant()}:{modelYear}";

        var cached = await cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = GetCacheDuration();

            var url = $"recalls/recallsByVehicle?make={Uri.EscapeDataString(make)}&model={Uri.EscapeDataString(model)}&modelYear={modelYear}";
            var response = await httpClient.GetFromJsonAsync<NhtsaRecallResponse>(url, ct);

            return (response?.Results ?? []).Select(MapToDto).ToList();
        });

        return cached ?? [];
    }

    private TimeSpan GetCacheDuration()
    {
        var minutes = configuration.GetValue<int?>("Nhtsa:CacheDurationMinutes");
        return minutes.HasValue ? TimeSpan.FromMinutes(minutes.Value) : DefaultCacheDuration;
    }

    private static RecallDto MapToDto(NhtsaRecallResult r) => new()
    {
        CampaignNumber = r.NhtsaCampaignNumber,
        Manufacturer = r.Manufacturer,
        Component = r.Component,
        Summary = r.Summary,
        Consequence = r.Consequence,
        Remedy = r.Remedy,
        Notes = r.Notes,
        ParkIt = r.ParkIt,
        ParkOutside = r.ParkOutSide,
    };
}
