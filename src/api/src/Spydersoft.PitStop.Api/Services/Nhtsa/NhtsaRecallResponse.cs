using System.Text.Json.Serialization;

namespace Spydersoft.PitStop.Api.Services.Nhtsa;

internal sealed class NhtsaRecallResponse
{
    [JsonPropertyName("Count")]
    public int Count { get; set; }

    [JsonPropertyName("results")]
    public List<NhtsaRecallResult> Results { get; set; } = [];
}

internal sealed class NhtsaRecallResult
{
    [JsonPropertyName("NHTSACampaignNumber")]
    public string NhtsaCampaignNumber { get; set; } = string.Empty;

    [JsonPropertyName("Manufacturer")]
    public string Manufacturer { get; set; } = string.Empty;

    [JsonPropertyName("Component")]
    public string Component { get; set; } = string.Empty;

    [JsonPropertyName("Summary")]
    public string Summary { get; set; } = string.Empty;

    [JsonPropertyName("Consequence")]
    public string Consequence { get; set; } = string.Empty;

    [JsonPropertyName("Remedy")]
    public string Remedy { get; set; } = string.Empty;

    [JsonPropertyName("Notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("parkIt")]
    public bool ParkIt { get; set; }

    [JsonPropertyName("parkOutSide")]
    public bool ParkOutSide { get; set; }
}
