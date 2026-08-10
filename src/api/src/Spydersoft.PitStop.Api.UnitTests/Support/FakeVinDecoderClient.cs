using Spydersoft.PitStop.Api.Services.Nhtsa;

namespace Spydersoft.PitStop.Api.UnitTests.Support;

/// <summary>
/// Returns a canned VIN decode result and records the last VIN queried, for assertions.
/// </summary>
internal sealed class FakeVinDecoderClient : IVinDecoderClient
{
    public string? LastVin { get; private set; }

    public VinDecodeResult? NextResult { get; set; } = new("Honda", "Accord", 2022);

    /// <summary>When set, every call throws this instead of returning a canned response.</summary>
    public Exception? FailWith { get; set; }

    public Task<VinDecodeResult?> DecodeAsync(string vin, CancellationToken ct = default)
    {
        if (FailWith is not null) throw FailWith;
        LastVin = vin;
        return Task.FromResult(NextResult);
    }
}
