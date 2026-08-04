namespace Spydersoft.PitStop.Contracts.Maintenance;

public class InitiateAttachmentUploadResponse
{
    public int AttachmentId { get; set; }
    public string UploadUrl { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
}
