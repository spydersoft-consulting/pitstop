using Spydersoft.PitStop.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Spydersoft.PitStop.Data.Configuration;

public class LocationConfiguration : IEntityTypeConfiguration<Location>
{
    public void Configure(EntityTypeBuilder<Location> builder)
    {
        builder.HasKey(l => l.Id);

        builder.Property(l => l.OwnerId).IsRequired().HasMaxLength(255);
        builder.Property(l => l.Name).IsRequired().HasMaxLength(200);
        builder.Property(l => l.Address).HasMaxLength(500);
        builder.Property(l => l.GooglePlaceId).HasMaxLength(255);

        builder.HasIndex(l => l.OwnerId);
        builder.HasIndex(l => new { l.OwnerId, l.LastUsedAt })
               .IsDescending(false, true);
        builder.HasIndex(l => new { l.OwnerId, l.Name });

        builder.HasQueryFilter(l => !l.IsDeleted);

        builder.HasMany(l => l.FillUps)
               .WithOne(f => f.Location!)
               .HasForeignKey(f => f.LocationId)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(l => l.MaintenanceLogs)
               .WithOne(m => m.Location!)
               .HasForeignKey(m => m.LocationId)
               .OnDelete(DeleteBehavior.SetNull);
    }
}
