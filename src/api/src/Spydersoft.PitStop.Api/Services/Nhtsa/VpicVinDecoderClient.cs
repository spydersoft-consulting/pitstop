using Microsoft.Extensions.Caching.Memory;

namespace Spydersoft.PitStop.Api.Services.Nhtsa;

public class VpicVinDecoderClient(HttpClient httpClient, IMemoryCache cache, IConfiguration configuration) : IVinDecoderClient
{
    private static readonly TimeSpan DefaultCacheDuration = TimeSpan.FromDays(30);

    public Task<VinDecodeResult?> DecodeAsync(string vin, CancellationToken ct = default)
    {
        var cacheKey = $"vpic-vin-decode:{vin.Trim().ToUpperInvariant()}";

        return cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = GetCacheDuration();

            var url = $"vehicles/DecodeVinValues/{Uri.EscapeDataString(vin)}?format=json";
            var response = await httpClient.GetFromJsonAsync<VpicDecodeVinResponse>(url, ct);
            var result = response?.Results.FirstOrDefault();

            if (result is null
                || string.IsNullOrWhiteSpace(result.Make)
                || string.IsNullOrWhiteSpace(result.Model)
                || !int.TryParse(result.ModelYear, out var modelYear))
            {
                return null;
            }

            return new VinDecodeResult(result.Make, result.Model, modelYear);
        });
    }

    private TimeSpan GetCacheDuration()
    {
        var minutes = configuration.GetValue<int?>("Nhtsa:VinDecodeCacheDurationMinutes");
        return minutes.HasValue ? TimeSpan.FromMinutes(minutes.Value) : DefaultCacheDuration;
    }
}
