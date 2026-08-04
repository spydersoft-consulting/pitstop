namespace Spydersoft.PitStop.Contracts.Maintenance;

public class MaintenanceAttachmentDto
{
    public int Id { get; set; }
    public Guid FileId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
}
