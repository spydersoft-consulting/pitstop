namespace Spydersoft.PitStop.Data.Entities;

/// <summary>
/// Records that a recall-alert notification has already been sent for a (vehicle, recall)
/// pair, so the scheduled recall-check job doesn't re-notify the owner on every run.
/// </summary>
public class RecallNotification
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public string CampaignNumber { get; set; } = string.Empty;
    public DateTimeOffset NotifiedAt { get; set; }

    public Vehicle Vehicle { get; set; } = null!;
}
