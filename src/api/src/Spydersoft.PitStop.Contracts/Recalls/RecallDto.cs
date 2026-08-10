namespace Spydersoft.PitStop.Contracts.Recalls;

public class RecallDto
{
    public string CampaignNumber { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public string Component { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string Consequence { get; set; } = string.Empty;
    public string Remedy { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public bool ParkIt { get; set; }
    public bool ParkOutside { get; set; }
}
