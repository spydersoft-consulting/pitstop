using Spydersoft.PitStop.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Spydersoft.PitStop.Data.Configuration;

public class RecallNotificationConfiguration : IEntityTypeConfiguration<RecallNotification>
{
    public void Configure(EntityTypeBuilder<RecallNotification> builder)
    {
        builder.HasKey(r => r.Id);

        builder.Property(r => r.CampaignNumber).IsRequired().HasMaxLength(50);

        builder.HasIndex(r => new { r.VehicleId, r.CampaignNumber }).IsUnique();

        builder.HasQueryFilter(r => !r.Vehicle.IsDeleted);

        builder.HasOne(r => r.Vehicle)
               .WithMany(v => v.RecallNotifications)
               .HasForeignKey(r => r.VehicleId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
