using Spydersoft.PitStop.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Spydersoft.PitStop.Data.Configuration;

public class MaintenanceLogAttachmentConfiguration : IEntityTypeConfiguration<MaintenanceLogAttachment>
{
    public void Configure(EntityTypeBuilder<MaintenanceLogAttachment> builder)
    {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.FileName).HasMaxLength(255).IsRequired();
        builder.Property(a => a.ContentType).HasMaxLength(100).IsRequired();

        builder.HasOne(a => a.MaintenanceLog)
            .WithMany(m => m.Attachments)
            .HasForeignKey(a => a.MaintenanceLogId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasQueryFilter(a => !a.MaintenanceLog.IsDeleted && !a.MaintenanceLog.Vehicle.IsDeleted);

        builder.HasIndex(a => a.MaintenanceLogId);
    }
}
