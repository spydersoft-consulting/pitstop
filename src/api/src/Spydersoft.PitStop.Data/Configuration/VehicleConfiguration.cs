using Spydersoft.PitStop.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Spydersoft.PitStop.Data.Configuration;

public class VehicleConfiguration : IEntityTypeConfiguration<Vehicle>
{
    public void Configure(EntityTypeBuilder<Vehicle> builder)
    {
        builder.HasKey(v => v.Id);

        builder.Property(v => v.OwnerId).IsRequired().HasMaxLength(255);
        builder.Property(v => v.Name).IsRequired().HasMaxLength(100);
        builder.Property(v => v.Make).IsRequired().HasMaxLength(50);
        builder.Property(v => v.Model).IsRequired().HasMaxLength(50);
        builder.Property(v => v.Trim).HasMaxLength(50);
        builder.Property(v => v.InitialOdometer).HasPrecision(10, 1);
        builder.Property(v => v.TankCapacityGallons).HasPrecision(6, 2);
        builder.Property(v => v.PlateState).HasMaxLength(2);
        builder.Property(v => v.PlateNumber).HasMaxLength(20);
        builder.Property(v => v.Vin).HasMaxLength(17);

        builder.HasIndex(v => v.OwnerId);
        builder.HasQueryFilter(v => !v.IsDeleted);

        builder.HasMany(v => v.FillUps)
               .WithOne(f => f.Vehicle)
               .HasForeignKey(f => f.VehicleId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
