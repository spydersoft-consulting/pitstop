using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using NUnit.Framework;
using Spydersoft.PitStop.Api.Jobs;
using Spydersoft.PitStop.Api.Services.Reminders;
using Spydersoft.PitStop.Api.UnitTests.Support;
using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.Data.Entities;

namespace Spydersoft.PitStop.Api.UnitTests.Jobs;

[TestFixture]
public class ReminderCheckRunnerTests
{
    private PitStopDbContext _db = null!;
    private FakeNotificationClient _notificationClient = null!;
    private FakeTimeProvider _time = null!;
    private ReminderCheckRunner _runner = null!;
    private Vehicle _vehicle = null!;

    [SetUp]
    public void SetUp()
    {
        var options = new DbContextOptionsBuilder<PitStopDbContext>()
            .UseInMemoryDatabase($"reminder-check-tests-{Guid.NewGuid()}")
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        _db = new PitStopDbContext(options);
        _notificationClient = new FakeNotificationClient();
        _time = new FakeTimeProvider { UtcNow = new DateTimeOffset(2026, 6, 1, 12, 0, 0, TimeSpan.Zero) };
        _runner = new ReminderCheckRunner(
            _db,
            new ReminderService(_db, _time),
            _notificationClient,
            _time,
            NullLogger<ReminderCheckRunner>.Instance);

        _vehicle = new Vehicle
        {
            OwnerId = "owner-1",
            Name = "Mine",
            Year = 2022,
            Make = "Honda",
            Model = "Accord",
            InitialOdometer = 10000,
            StartDate = new DateOnly(2026, 5, 1),
        };
        _db.Vehicles.Add(_vehicle);
        _db.SaveChanges();
    }

    [TearDown]
    public void TearDown() => _db.Dispose();

    private MaintenanceReminder AddReminder(bool active = true, decimal miles = 5000, decimal lead = 500)
    {
        var reminder = new MaintenanceReminder
        {
            VehicleId = _vehicle.Id,
            ServiceType = MaintenanceType.OilChange,
            Name = "Oil change",
            IntervalMiles = miles,
            LeadMiles = lead,
            IsActive = active,
        };
        _db.MaintenanceReminders.Add(reminder);
        _db.SaveChanges();
        return reminder;
    }

    private void AddOdometerReading(decimal odometer)
    {
        _db.FillUps.Add(new FillUp
        {
            VehicleId = _vehicle.Id,
            FilledAt = _time.UtcNow,
            OdometerReading = odometer,
            GallonsAdded = 10,
            PricePerGallon = 3,
            TotalCost = 30,
        });
        _db.SaveChanges();
    }

    [Test]
    public async Task RunAsync_DoesNothing_WhenReminderIsNotYetDueSoon()
    {
        AddReminder();
        AddOdometerReading(11000);

        await _runner.RunAsync();

        Assert.That(_notificationClient.CreatedRequests, Is.Empty);
    }

    [Test]
    public async Task RunAsync_SendsApproachingNotification_WithinLeadDistance()
    {
        var reminder = AddReminder();
        AddOdometerReading(14600);

        await _runner.RunAsync();

        Assert.That(_notificationClient.CreatedRequests, Has.Count.EqualTo(1));
        var request = _notificationClient.CreatedRequests[0];
        Assert.That(request.UserId, Is.EqualTo("owner-1"));
        Assert.That(request.Type, Is.EqualTo("maintenance-due"));
        Assert.That(request.Subject, Does.Contain("coming due"));
        Assert.That(request.EntityType, Is.EqualTo("Vehicle"));
        Assert.That(request.EntityId, Is.EqualTo(_vehicle.Id.ToString()));
        Assert.That(request.Data!["reminderId"], Is.EqualTo(reminder.Id.ToString()));
        Assert.That(_db.ReminderNotifications.Single().Stage, Is.EqualTo(ReminderStage.Approaching));
    }

    [Test]
    public async Task RunAsync_DoesNotReNotify_ForSameStageAndCycle()
    {
        AddReminder();
        AddOdometerReading(14600);

        await _runner.RunAsync();
        await _runner.RunAsync();

        Assert.That(_notificationClient.CreatedRequests, Has.Count.EqualTo(1));
    }

    [Test]
    public async Task RunAsync_NotifiesAgain_WhenReminderEscalatesToOverdue()
    {
        AddReminder();
        AddOdometerReading(14600);
        await _runner.RunAsync();

        AddOdometerReading(15200);
        await _runner.RunAsync();

        Assert.That(_notificationClient.CreatedRequests, Has.Count.EqualTo(2));
        Assert.That(_notificationClient.CreatedRequests[1].Subject, Does.Contain("overdue"));
    }

    [Test]
    public async Task RunAsync_NotifiesAgain_InNewCycleAfterServiceIsCompleted()
    {
        var reminder = AddReminder();
        AddOdometerReading(15200);
        await _runner.RunAsync();

        reminder.LastDoneDate = new DateOnly(2026, 6, 1);
        reminder.LastDoneOdometer = 15200;
        _db.SaveChanges();
        AddOdometerReading(20300);
        await _runner.RunAsync();

        Assert.That(_notificationClient.CreatedRequests, Has.Count.EqualTo(2));
    }

    [Test]
    public async Task RunAsync_SkipsInactiveAndSnoozedReminders()
    {
        AddReminder(active: false);
        var snoozed = AddReminder();
        snoozed.SnoozedUntil = new DateOnly(2026, 6, 10);
        _db.SaveChanges();
        AddOdometerReading(16000);

        await _runner.RunAsync();

        Assert.That(_notificationClient.CreatedRequests, Is.Empty);
    }

    [Test]
    public async Task RunAsync_SkipsDeletedVehicles()
    {
        AddReminder();
        AddOdometerReading(16000);
        _vehicle.IsDeleted = true;
        _db.SaveChanges();

        await _runner.RunAsync();

        Assert.That(_notificationClient.CreatedRequests, Is.Empty);
    }

    [Test]
    public async Task RunAsync_RemovesLedgerEntry_WhenSendFails_SoNextRunRetries()
    {
        AddReminder();
        AddOdometerReading(16000);
        _notificationClient.FailWith = new HttpRequestException("down");

        await _runner.RunAsync();
        Assert.That(_db.ReminderNotifications.Count(), Is.Zero);

        _notificationClient.FailWith = null;
        await _runner.RunAsync();

        Assert.That(_notificationClient.CreatedRequests, Has.Count.EqualTo(1));
        Assert.That(_db.ReminderNotifications.Count(), Is.EqualTo(1));
    }
}
