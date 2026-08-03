using Microsoft.Data.Sqlite;
using NUnit.Framework;
using Microsoft.EntityFrameworkCore;
using Spydersoft.PitStop.Api.Services;
using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.Data.Entities;

namespace Spydersoft.PitStop.Api.UnitTests.Services;

[TestFixture]
public class FillUpServiceTests
{
    private SqliteConnection _connection = null!;
    private PitStopDbContext _db = null!;
    private FillUpService _service = null!;

    [SetUp]
    public void SetUp()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<PitStopDbContext>()
            .UseSqlite(_connection)
            .Options;

        _db = new PitStopDbContext(options);
        _db.Database.EnsureCreated();
        _service = new FillUpService(_db);
    }

    [TearDown]
    public void TearDown()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    private async Task<Vehicle> CreateVehicleAsync()
    {
        var vehicle = new Vehicle
        {
            OwnerId = "test-user",
            Name = "Test Bronco",
            Year = 2024,
            Make = "Ford",
            Model = "Bronco",
            StartDate = new DateOnly(2024, 1, 1)
        };
        _db.Vehicles.Add(vehicle);
        await _db.SaveChangesAsync();
        return vehicle;
    }

    private static FillUp MakeFillUp(int vehicleId, decimal odometer, decimal gallons, bool full = true) => new()
    {
        VehicleId = vehicleId,
        FilledAt = DateTimeOffset.UtcNow,
        OdometerReading = odometer,
        GallonsAdded = gallons,
        PricePerGallon = 3.50m,
        TotalCost = Math.Round(gallons * 3.50m, 2),
        IsFullFillUp = full
    };

    [Test]
    public async Task SingleFillUp_HasNoComputedValues()
    {
        var v = await CreateVehicleAsync();
        _db.FillUps.Add(MakeFillUp(v.Id, 1000, 10));
        await _db.SaveChangesAsync();

        await _service.RecalculateComputedFieldsAsync(v.Id);

        var f = await _db.FillUps.SingleAsync();
        Assert.That(f.MilesSinceLastFillUp, Is.Null);
        Assert.That(f.MpgThisFillUp, Is.Null);
    }

    [Test]
    public async Task TwoFullFillUps_ComputesMilesAndMpg()
    {
        var v = await CreateVehicleAsync();
        _db.FillUps.AddRange(
            MakeFillUp(v.Id, 1000, 10),
            MakeFillUp(v.Id, 1300, 12.5m));
        await _db.SaveChangesAsync();

        await _service.RecalculateComputedFieldsAsync(v.Id);

        var fillUps = await _db.FillUps.OrderBy(f => f.OdometerReading).ToListAsync();
        Assert.That(fillUps[0].MilesSinceLastFillUp, Is.Null);
        Assert.That(fillUps[0].MpgThisFillUp, Is.Null);
        Assert.That(fillUps[1].MilesSinceLastFillUp, Is.EqualTo(300));
        Assert.That(fillUps[1].MpgThisFillUp, Is.EqualTo(24.00m)); // 300 / 12.5 = 24
    }

    [Test]
    public async Task NonFullFillUp_MilesSetButMpgNull()
    {
        var v = await CreateVehicleAsync();
        _db.FillUps.AddRange(
            MakeFillUp(v.Id, 1000, 10),
            MakeFillUp(v.Id, 1200, 5, full: false));
        await _db.SaveChangesAsync();

        await _service.RecalculateComputedFieldsAsync(v.Id);

        var fillUps = await _db.FillUps.OrderBy(f => f.OdometerReading).ToListAsync();
        Assert.That(fillUps[1].MilesSinceLastFillUp, Is.EqualTo(200));
        Assert.That(fillUps[1].MpgThisFillUp, Is.Null);
    }

    [Test]
    public async Task ThreeFullFillUps_AllComputedCorrectly()
    {
        var v = await CreateVehicleAsync();
        _db.FillUps.AddRange(
            MakeFillUp(v.Id, 1000, 10),   // baseline
            MakeFillUp(v.Id, 1250, 10),   // 250 mi / 10 gal = 25 mpg
            MakeFillUp(v.Id, 1600, 14));  // 350 mi / 14 gal = 25 mpg
        await _db.SaveChangesAsync();

        await _service.RecalculateComputedFieldsAsync(v.Id);

        var f = await _db.FillUps.OrderBy(x => x.OdometerReading).ToListAsync();
        Assert.That(f[0].MilesSinceLastFillUp, Is.Null);
        Assert.That(f[0].MpgThisFillUp, Is.Null);
        Assert.That(f[1].MilesSinceLastFillUp, Is.EqualTo(250));
        Assert.That(f[1].MpgThisFillUp, Is.EqualTo(25.00m));
        Assert.That(f[2].MilesSinceLastFillUp, Is.EqualTo(350));
        Assert.That(f[2].MpgThisFillUp, Is.EqualTo(25.00m));
    }

    [Test]
    public async Task EmptyVehicle_CompletesWithoutError()
    {
        var v = await CreateVehicleAsync();

        await _service.RecalculateComputedFieldsAsync(v.Id);

        Assert.That(await _db.FillUps.CountAsync(), Is.EqualTo(0));
    }

    [Test]
    public async Task FillUpsOrderedByOdometer_NotInsertionOrder()
    {
        var v = await CreateVehicleAsync();
        _db.FillUps.AddRange(
            MakeFillUp(v.Id, 1300, 12.5m),
            MakeFillUp(v.Id, 1000, 10));
        await _db.SaveChangesAsync();

        await _service.RecalculateComputedFieldsAsync(v.Id);

        var f = await _db.FillUps.OrderBy(x => x.OdometerReading).ToListAsync();
        Assert.That(f[0].MilesSinceLastFillUp, Is.Null);       // odometer=1000 is first
        Assert.That(f[1].MilesSinceLastFillUp, Is.EqualTo(300)); // 1300 - 1000 = 300
    }

    [Test]
    public async Task Recalculate_ClearsStaleComputedValues()
    {
        var v = await CreateVehicleAsync();
        var f1 = MakeFillUp(v.Id, 1000, 10);
        var f2 = MakeFillUp(v.Id, 1300, 12.5m);
        _db.FillUps.AddRange(f1, f2);
        await _db.SaveChangesAsync();
        await _service.RecalculateComputedFieldsAsync(v.Id);

        _db.FillUps.Remove(f2);
        await _db.SaveChangesAsync();
        await _service.RecalculateComputedFieldsAsync(v.Id);

        var remaining = await _db.FillUps.SingleAsync();
        Assert.That(remaining.MilesSinceLastFillUp, Is.Null);
        Assert.That(remaining.MpgThisFillUp, Is.Null);
    }
}
