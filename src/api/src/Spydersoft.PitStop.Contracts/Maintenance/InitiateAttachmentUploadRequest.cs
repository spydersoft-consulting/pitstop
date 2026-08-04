using System.ComponentModel.DataAnnotations;

namespace Spydersoft.PitStop.Contracts.Maintenance;

public class InitiateAttachmentUploadRequest
{
    [Required]
    [MaxLength(255)]
    public string FileName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string ContentType { get; set; } = string.Empty;

    [Range(1, long.MaxValue)]
    public long SizeBytes { get; set; }
}
