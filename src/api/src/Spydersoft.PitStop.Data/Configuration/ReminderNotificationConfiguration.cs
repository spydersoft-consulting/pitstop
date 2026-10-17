using Spydersoft.PitStop.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Spydersoft.PitStop.Data.Configuration;

public class ReminderNotificationConfiguration : IEntityTypeConfiguration<ReminderNotification>
{
    public void Configure(EntityTypeBuilder<ReminderNotification> builder)
    {
        builder.HasKey(n => n.Id);

        builder.Property(n => n.Stage).HasConversion<string>().HasMaxLength(20);
        builder.Property(n => n.CycleKey).IsRequired().HasMaxLength(40);

        builder.HasIndex(n => new { n.ReminderId, n.Stage, n.CycleKey }).IsUnique();

        builder.HasOne(n => n.Reminder)
            .WithMany(r => r.Notifications)
            .HasForeignKey(n => n.ReminderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasQueryFilter(n => !n.Reminder.Vehicle.IsDeleted);
    }
}
