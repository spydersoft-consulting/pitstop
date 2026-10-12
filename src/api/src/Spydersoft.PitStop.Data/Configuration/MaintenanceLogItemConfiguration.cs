using Spydersoft.PitStop.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Spydersoft.PitStop.Data.Configuration;

public class MaintenanceLogItemConfiguration : IEntityTypeConfiguration<MaintenanceLogItem>
{
    public void Configure(EntityTypeBuilder<MaintenanceLogItem> builder)
    {
        builder.HasKey(i => i.Id);

        builder.Property(i => i.ServiceType).HasConversion<string>().HasMaxLength(30);
        builder.Property(i => i.Description).HasMaxLength(200);

        builder.Property(i => i.PartsCost).HasPrecision(8, 2);
        builder.Property(i => i.LaborCost).HasPrecision(8, 2);
        builder.Property(i => i.TotalCost).HasPrecision(8, 2);

        builder.HasOne(i => i.MaintenanceLog)
            .WithMany(m => m.Items)
            .HasForeignKey(i => i.MaintenanceLogId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasQueryFilter(i => !i.MaintenanceLog.IsDeleted && !i.MaintenanceLog.Vehicle.IsDeleted);

        builder.HasIndex(i => i.MaintenanceLogId);
        builder.HasIndex(i => i.ServiceType);
    }
}
