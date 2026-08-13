using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using NUnit.Framework;
using Spydersoft.Notification.Contracts;
using Spydersoft.PitStop.Api.Jobs;
using Spydersoft.PitStop.Api.UnitTests.Support;
using Spydersoft.PitStop.Contracts.Recalls;
using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.Data.Entities;

namespace Spydersoft.PitStop.Api.UnitTests.Jobs;

[TestFixture]
public class RecallCheckRunnerTests
{
    private PitStopDbContext _db = null!;
    private FakeVinDecoderClient _vinDecoder = null!;
    private FakeNhtsaRecallClient _recallClient = null!;
    private FakeNotificationClient _notificationClient = null!;
    private RecallCheckRunner _runner = null!;

    [SetUp]
    public void SetUp()
    {
        var options = new DbContextOptionsBuilder<PitStopDbContext>()
            .UseInMemoryDatabase($"recall-check-tests-{Guid.NewGuid()}")
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        _db = new PitStopDbContext(options);
        _vinDecoder = new FakeVinDecoderClient();
        _recallClient = new FakeNhtsaRecallClient();
        _notificationClient = new FakeNotificationClient();
        _runner = new RecallCheckRunner(_db, _vinDecoder, _recallClient, _notificationClient, NullLogger<RecallCheckRunner>.Instance);
    }

    [TearDown]
    public void TearDown() => _db.Dispose();

    private Vehicle AddVehicle(string ownerId = "owner-1", string? vin = "1HGCM82633A123456")
    {
        var vehicle = new Vehicle
        {
            OwnerId = ownerId,
            Name = "Mine",
            Year = 2022,
            Make = "Honda",
            Model = "Accord",
            InitialOdometer = 0,
            StartDate = new DateOnly(2022, 1, 1),
            Vin = vin,
        };
        _db.Vehicles.Add(vehicle);
        _db.SaveChanges();
        return vehicle;
    }

    [Test]
    public async Task RunAsync_SendsNotification_ForNewRecall()
    {
        var vehicle = AddVehicle();
        _recallClient.NextResult = [new RecallDto { CampaignNumber = "22V123000", Summary = "Steering issue" }];

        await _runner.RunAsync();

        Assert.That(_notificationClient.CreatedRequests, Has.Count.EqualTo(1));
        var request = _notificationClient.CreatedRequests[0];
        Assert.That(request.UserId, Is.EqualTo(vehicle.OwnerId));
        Assert.That(request.Type, Is.EqualTo("recall-alert"));
        Assert.That(request.Priority, Is.EqualTo(NotificationPriority.High));
        Assert.That(request.EntityType, Is.EqualTo("Vehicle"));
        Assert.That(request.EntityId, Is.EqualTo(vehicle.Id.ToString()));
        Assert.That(request.Data!["recallId"], Is.EqualTo("22V123000"));

        Assert.That(_db.RecallNotifications.Count(), Is.EqualTo(1));
    }

    [Test]
    public async Task RunAsync_DoesNotReNotify_ForRecallAlreadyRecorded()
    {
        var vehicle = AddVehicle();
        _recallClient.NextResult = [new RecallDto { CampaignNumber = "22V123000", Summary = "Steering issue" }];
        _db.RecallNotifications.Add(new RecallNotification
        {
            VehicleId = vehicle.Id,
            CampaignNumber = "22V123000",
            NotifiedAt = DateTimeOffset.UtcNow.AddDays(-1),
        });
        _db.SaveChanges();

        await _runner.RunAsync();

        Assert.That(_notificationClient.CreatedRequests, Is.Empty);
    }

    [Test]
    public async Task RunAsync_NotifiesOnlyForNewRecall_WhenSomeAlreadyNotified()
    {
        var vehicle = AddVehicle();
        _recallClient.NextResult =
        [
            new RecallDto { CampaignNumber = "22V123000", Summary = "Already notified" },
            new RecallDto { CampaignNumber = "23V456000", Summary = "New recall" },
        ];
        _db.RecallNotifications.Add(new RecallNotification
        {
            VehicleId = vehicle.Id,
            CampaignNumber = "22V123000",
            NotifiedAt = DateTimeOffset.UtcNow.AddDays(-1),
        });
        _db.SaveChanges();

        await _runner.RunAsync();

        Assert.That(_notificationClient.CreatedRequests, Has.Count.EqualTo(1));
        Assert.That(_notificationClient.CreatedRequests[0].Data!["recallId"], Is.EqualTo("23V456000"));
    }

    [Test]
    public async Task RunAsync_SkipsVehicle_WithoutVin()
    {
        AddVehicle(vin: null);

        await _runner.RunAsync();

        Assert.That(_vinDecoder.LastVin, Is.Null);
        Assert.That(_notificationClient.CreatedRequests, Is.Empty);
    }

    [Test]
    public async Task RunAsync_SkipsVehicle_WhenVinCannotBeDecoded()
    {
        AddVehicle();
        _vinDecoder.NextResult = null;

        await _runner.RunAsync();

        Assert.That(_notificationClient.CreatedRequests, Is.Empty);
    }

    [Test]
    public async Task RunAsync_SkipsVehicle_WhenVinDecodeServiceFails()
    {
        AddVehicle();
        _vinDecoder.FailWith = new HttpRequestException("boom");

        Assert.DoesNotThrowAsync(async () => await _runner.RunAsync());
        Assert.That(_notificationClient.CreatedRequests, Is.Empty);
    }

    [Test]
    public async Task RunAsync_SkipsVehicle_WhenRecallServiceFails()
    {
        AddVehicle();
        _recallClient.FailWith = new HttpRequestException("boom");

        Assert.DoesNotThrowAsync(async () => await _runner.RunAsync());
        Assert.That(_notificationClient.CreatedRequests, Is.Empty);
    }

    [Test]
    public async Task RunAsync_DoesNothing_WhenNoRecalls()
    {
        AddVehicle();
        _recallClient.NextResult = [];

        await _runner.RunAsync();

        Assert.That(_notificationClient.CreatedRequests, Is.Empty);
        Assert.That(_db.RecallNotifications.Count(), Is.EqualTo(0));
    }

    [Test]
    public async Task RunAsync_ChecksMultipleVehicles_Independently()
    {
        var v1 = AddVehicle(ownerId: "owner-1", vin: "1HGCM82633A123456");
        var v2 = AddVehicle(ownerId: "owner-2", vin: "2HGCM82633A654321");
        _recallClient.NextResult = [new RecallDto { CampaignNumber = "22V123000", Summary = "Steering issue" }];

        await _runner.RunAsync();

        Assert.That(_notificationClient.CreatedRequests, Has.Count.EqualTo(2));
        Assert.That(_notificationClient.CreatedRequests.Select(r => r.UserId), Is.EquivalentTo(new[] { v1.OwnerId, v2.OwnerId }));
    }
}
