using System.Text.Json.Serialization;

namespace Spydersoft.PitStop.Api.Services.Nhtsa;

internal sealed class VpicDecodeVinResponse
{
    [JsonPropertyName("Results")]
    public List<VpicDecodeVinResult> Results { get; set; } = [];
}

internal sealed class VpicDecodeVinResult
{
    [JsonPropertyName("Make")]
    public string? Make { get; set; }

    [JsonPropertyName("Model")]
    public string? Model { get; set; }

    [JsonPropertyName("ModelYear")]
    public string? ModelYear { get; set; }
}
