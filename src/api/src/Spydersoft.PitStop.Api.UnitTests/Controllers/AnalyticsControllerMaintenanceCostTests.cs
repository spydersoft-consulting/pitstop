using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;
using Spydersoft.PitStop.Api.Controllers;
using Spydersoft.PitStop.Api.UnitTests.Support;
using Spydersoft.PitStop.Contracts.Analytics;
using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.Data.Entities;

namespace Spydersoft.PitStop.Api.UnitTests.Controllers;

[TestFixture]
public class AnalyticsControllerMaintenanceCostTests
{
    private const string TestUserId = TestDataHelpers.TestUserId;

    private PitStopDbContext _db = null!;
    private AnalyticsController _controller = null!;

    [SetUp]
    public void SetUp()
    {
        var options = new DbContextOptionsBuilder<PitStopDbContext>()
            .UseInMemoryDatabase($"analytics-maintenance-tests-{Guid.NewGuid()}")
            .Options;

        _db = new PitStopDbContext(options);
        _controller = new AnalyticsController(_db)
        {
            ControllerContext = TestDataHelpers.BuildControllerContext(TestUserId)
        };
    }

    [TearDown]
    public void TearDown() => _db.Dispose();

    private async Task AddLogAsync(int vehicleId, DateOnly date, params MaintenanceLogItem[] items)
    {
        _db.MaintenanceLogs.Add(new MaintenanceLog
        {
            VehicleId = vehicleId,
            ServiceDate = date,
            OdometerReading = 1000,
            PerformedBy = ServicePerformedBy.Shop,
            Items = [.. items],
        });
        await _db.SaveChangesAsync();
    }

    private async Task<MaintenanceCostResponse> GetAsync(int vehicleId, DateOnly? start = null, DateOnly? end = null)
    {
        var result = await _controller.GetMaintenanceCost(vehicleId, start, end, CancellationToken.None);
        return (MaintenanceCostResponse)((OkObjectResult)result.Result!).Value!;
    }

    [Test]
    public async Task GetMaintenanceCost_ReturnsNotFound_WhenVehicleNotOwnedByCaller()
    {
        var v = await TestDataHelpers.CreateVehicleAsync(_db, "someone-else");

        var result = await _controller.GetMaintenanceCost(v.Id, null, null, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task GetMaintenanceCost_GroupsItemsByType_AcrossVisits()
    {
        var v = await TestDataHelpers.CreateVehicleAsync(_db, TestUserId);
        await AddLogAsync(v.Id, new DateOnly(2026, 1, 1),
            new MaintenanceLogItem { ServiceType = MaintenanceType.OilChange, PartsCost = 30m, LaborCost = 20m },
            new MaintenanceLogItem { ServiceType = MaintenanceType.TireRotation, TotalCost = 25m });
        await AddLogAsync(v.Id, new DateOnly(2026, 6, 1),
            new MaintenanceLogItem { ServiceType = MaintenanceType.OilChange, TotalCost = 60m, PartsCost = 5m });

        var response = await GetAsync(v.Id);

        Assert.That(response.Points, Has.Count.EqualTo(2));
        var oil = response.Points.Single(p => p.ServiceType == "OilChange");
        Assert.That(oil.Count, Is.EqualTo(2));
        Assert.That(oil.TotalCost, Is.EqualTo(110m));
        Assert.That(oil.PartsCost, Is.EqualTo(35m));
        Assert.That(oil.LaborCost, Is.EqualTo(20m));
        Assert.That(response.Points[0].ServiceType, Is.EqualTo("OilChange"), "ordered by total cost descending");
    }

    [Test]
    public async Task GetMaintenanceCost_CountsWarrantyItems()
    {
        var v = await TestDataHelpers.CreateVehicleAsync(_db, TestUserId);
        await AddLogAsync(v.Id, new DateOnly(2026, 1, 1),
            new MaintenanceLogItem { ServiceType = MaintenanceType.Recall, IsWarrantyWork = true },
            new MaintenanceLogItem { ServiceType = MaintenanceType.Recall, TotalCost = 10m });

        var response = await GetAsync(v.Id);

        var recall = response.Points.Single();
        Assert.That(recall.Count, Is.EqualTo(2));
        Assert.That(recall.WarrantyCount, Is.EqualTo(1));
        Assert.That(recall.TotalCost, Is.EqualTo(10m));
    }

    [Test]
    public async Task GetMaintenanceCost_FiltersByVisitDateRange()
    {
        var v = await TestDataHelpers.CreateVehicleAsync(_db, TestUserId);
        await AddLogAsync(v.Id, new DateOnly(2026, 1, 1),
            new MaintenanceLogItem { ServiceType = MaintenanceType.OilChange, TotalCost = 50m });
        await AddLogAsync(v.Id, new DateOnly(2026, 6, 1),
            new MaintenanceLogItem { ServiceType = MaintenanceType.OilChange, TotalCost = 70m });

        var response = await GetAsync(v.Id, new DateOnly(2026, 3, 1), new DateOnly(2026, 12, 31));

        Assert.That(response.Points.Single().TotalCost, Is.EqualTo(70m));
    }

    [Test]
    public async Task GetMaintenanceCost_ExcludesOtherVehiclesAndDeletedLogs()
    {
        var v = await TestDataHelpers.CreateVehicleAsync(_db, TestUserId);
        var other = await TestDataHelpers.CreateVehicleAsync(_db, TestUserId);
        await AddLogAsync(v.Id, new DateOnly(2026, 1, 1),
            new MaintenanceLogItem { ServiceType = MaintenanceType.OilChange, TotalCost = 50m });
        await AddLogAsync(other.Id, new DateOnly(2026, 1, 1),
            new MaintenanceLogItem { ServiceType = MaintenanceType.OilChange, TotalCost = 999m });
        await AddLogAsync(v.Id, new DateOnly(2026, 2, 1),
            new MaintenanceLogItem { ServiceType = MaintenanceType.Battery, TotalCost = 200m });
        var deleted = await _db.MaintenanceLogs.SingleAsync(m => m.ServiceDate == new DateOnly(2026, 2, 1));
        deleted.IsDeleted = true;
        await _db.SaveChangesAsync();

        var response = await GetAsync(v.Id);

        Assert.That(response.Points.Single().ServiceType, Is.EqualTo("OilChange"));
        Assert.That(response.Points.Single().TotalCost, Is.EqualTo(50m));
    }
}
