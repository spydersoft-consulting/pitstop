using Spydersoft.PitStop.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Spydersoft.PitStop.Data.Configuration;

public class MaintenanceReminderConfiguration : IEntityTypeConfiguration<MaintenanceReminder>
{
    public void Configure(EntityTypeBuilder<MaintenanceReminder> builder)
    {
        builder.HasKey(r => r.Id);

        builder.Property(r => r.ServiceType).HasConversion<string>().HasMaxLength(30);
        builder.Property(r => r.Source).HasConversion<string>().HasMaxLength(20);
        builder.Property(r => r.Name).IsRequired().HasMaxLength(100);

        builder.Property(r => r.IntervalMiles).HasPrecision(10, 1);
        builder.Property(r => r.LeadMiles).HasPrecision(10, 1);
        builder.Property(r => r.LastDoneOdometer).HasPrecision(10, 1);

        builder.ToTable(t => t.HasCheckConstraint(
            "CK_MaintenanceReminders_HasInterval",
            "\"IntervalMiles\" > 0 OR \"IntervalMonths\" > 0"));

        builder.HasOne(r => r.Vehicle)
            .WithMany(v => v.MaintenanceReminders)
            .HasForeignKey(r => r.VehicleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasQueryFilter(r => !r.Vehicle.IsDeleted);

        builder.HasIndex(r => r.VehicleId);
    }
}
