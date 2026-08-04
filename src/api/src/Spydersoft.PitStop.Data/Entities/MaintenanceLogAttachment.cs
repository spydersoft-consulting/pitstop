namespace Spydersoft.PitStop.Data.Entities;

public class MaintenanceLogAttachment
{
    public int Id { get; set; }
    public int MaintenanceLogId { get; set; }
    public MaintenanceLog MaintenanceLog { get; set; } = null!;

    public Guid FileId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public bool IsConfirmed { get; set; }
}
