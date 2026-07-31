using Spydersoft.PitStop.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Spydersoft.PitStop.Data.Configuration;

public class MaintenanceLogConfiguration : IEntityTypeConfiguration<MaintenanceLog>
{
    public void Configure(EntityTypeBuilder<MaintenanceLog> builder)
    {
        builder.HasKey(m => m.Id);

        builder.Property(m => m.ServiceType).HasConversion<string>().HasMaxLength(30);
        builder.Property(m => m.PerformedBy).HasConversion<string>().HasMaxLength(20);

        builder.Property(m => m.OdometerReading).HasPrecision(10, 1);
        builder.Property(m => m.PartsCost).HasPrecision(8, 2);
        builder.Property(m => m.LaborCost).HasPrecision(8, 2);
        builder.Property(m => m.TotalCost).HasPrecision(8, 2);

        builder.Property(m => m.Description).HasMaxLength(200);
        builder.Property(m => m.Notes).HasMaxLength(1000);

        builder.HasOne(m => m.Vehicle)
            .WithMany(v => v.MaintenanceLogs)
            .HasForeignKey(m => m.VehicleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(m => m.Location)
            .WithMany(l => l.MaintenanceLogs)
            .HasForeignKey(m => m.LocationId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasQueryFilter(m => !m.IsDeleted && !m.Vehicle.IsDeleted);

        builder.HasIndex(m => new { m.VehicleId, m.ServiceDate });
        builder.HasIndex(m => new { m.VehicleId, m.OdometerReading });
    }
}
