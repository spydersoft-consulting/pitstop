namespace Spydersoft.PitStop.Api.Services.Nhtsa;

public interface IVinDecoderClient
{
    /// <summary>Decodes a VIN into make/model/year. Returns null if the VIN could not be decoded.</summary>
    Task<VinDecodeResult?> DecodeAsync(string vin, CancellationToken ct = default);
}
