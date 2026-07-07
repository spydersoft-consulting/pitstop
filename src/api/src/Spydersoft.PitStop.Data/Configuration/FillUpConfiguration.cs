using Spydersoft.PitStop.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Spydersoft.PitStop.Data.Configuration;

public class FillUpConfiguration : IEntityTypeConfiguration<FillUp>
{
    public void Configure(EntityTypeBuilder<FillUp> builder)
    {
        builder.HasKey(f => f.Id);

        builder.Property(f => f.FuelGrade).HasConversion<string>().HasMaxLength(20);
        builder.Property(f => f.OdometerReading).HasPrecision(10, 1);
        builder.Property(f => f.GallonsAdded).HasPrecision(8, 3);
        builder.Property(f => f.PricePerGallon).HasPrecision(6, 3);
        builder.Property(f => f.TotalCost).HasPrecision(8, 2);
        builder.Property(f => f.MilesSinceLastFillUp).HasPrecision(10, 1);
        builder.Property(f => f.MpgThisFillUp).HasPrecision(6, 2);

        builder.Property(f => f.Notes).HasMaxLength(1000);

        builder.HasQueryFilter(f => !f.Vehicle.IsDeleted);

        builder.HasIndex(f => new { f.VehicleId, f.FilledAt });
        builder.HasIndex(f => new { f.VehicleId, f.OdometerReading });
    }
}
