using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;
using Spydersoft.PitStop.Api.Controllers;
using Spydersoft.PitStop.Api.Services;
using Spydersoft.PitStop.Api.UnitTests.Support;
using Spydersoft.PitStop.Contracts.Locations;
using Spydersoft.PitStop.Contracts.Maintenance;
using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.Data.Entities;

namespace Spydersoft.PitStop.Api.UnitTests.Controllers;

[TestFixture]
public class MaintenanceLogsControllerTests
{
    private const string TestUserId = TestDataHelpers.TestUserId;

    private PitStopDbContext _db = null!;
    private LocationService _locationService = null!;
    private MaintenanceLogsController _controller = null!;

    [SetUp]
    public void SetUp()
    {
        var options = new DbContextOptionsBuilder<PitStopDbContext>()
            .UseInMemoryDatabase($"maintenance-tests-{Guid.NewGuid()}")
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        _db = new PitStopDbContext(options);
        _locationService = new LocationService(_db);
        _controller = new MaintenanceLogsController(_db, _locationService)
        {
            ControllerContext = BuildControllerContext(TestUserId)
        };
    }

    [TearDown]
    public void TearDown() => _db.Dispose();

    private static ControllerContext BuildControllerContext(string? subClaim) =>
        TestDataHelpers.BuildControllerContext(subClaim);

    private Task<Vehicle> CreateVehicleAsync(string ownerId = TestUserId) =>
        TestDataHelpers.CreateVehicleAsync(_db, ownerId);

    private Task<Location> CreateLocationAsync(
        string name = "Jiffy Lube",
        string? address = null,
        string ownerId = TestUserId,
        int useCount = 0,
        DateTimeOffset? lastUsedAt = null) =>
        TestDataHelpers.CreateLocationAsync(_db, name, address, ownerId, useCount, lastUsedAt);

    private static CreateMaintenanceLogRequest TestRequest(decimal odometer = 1000m) => new()
    {
        ServiceDate = new DateOnly(2026, 1, 1),
        OdometerReading = odometer,
        ServiceType = "OilChange",
        PerformedBy = "Self",
    };

    [Test]
    public async Task GetAll_ReturnsOnlyLogsForVehicle_OwnedByCaller()
    {
        var v = await CreateVehicleAsync();
        _db.MaintenanceLogs.Add(new MaintenanceLog
        {
            VehicleId = v.Id,
            ServiceDate = new DateOnly(2026, 1, 1),
            OdometerReading = 1000,
            ServiceType = MaintenanceType.OilChange,
            PerformedBy = ServicePerformedBy.Self,
        });
        await _db.SaveChangesAsync();

        var result = await _controller.GetAll(
            v.Id,
            new MaintenanceLogQuery { SortBy = "odometer" },
            CancellationToken.None);

        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);
        var response = ok!.Value as MaintenanceLogListResponse;
        Assert.That(response, Is.Not.Null);
        Assert.That(response!.TotalCount, Is.EqualTo(1));
        Assert.That(response.Items, Has.Count.EqualTo(1));
    }

    [Test]
    public async Task GetAll_ReturnsNotFound_WhenVehicleNotOwnedByCaller()
    {
        var v = await CreateVehicleAsync(ownerId: "someone-else");

        var result = await _controller.GetAll(
            v.Id,
            new MaintenanceLogQuery { SortBy = "odometer" },
            CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task Create_ReturnsValidationProblem_WhenServiceTypeInvalid()
    {
        var v = await CreateVehicleAsync();

        var request = TestRequest();
        request.ServiceType = "NotAType";

        var result = await _controller.Create(v.Id, request, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<ObjectResult>());
        var problem = ((ObjectResult)result.Result!).Value as ValidationProblemDetails;
        Assert.That(problem, Is.Not.Null);
    }

    [Test]
    public async Task Create_PersistsLog_WhenRequestIsValid()
    {
        var v = await CreateVehicleAsync();

        var result = await _controller.Create(v.Id, TestRequest(), CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<CreatedAtActionResult>());
        Assert.That(await _db.MaintenanceLogs.CountAsync(), Is.EqualTo(1));
    }

    [Test]
    public void GetCurrentUserId_Throws_WhenNoSubClaim()
    {
        _controller.ControllerContext = BuildControllerContext(subClaim: null);

        Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await _controller.GetAll(
                vehicleId: 1,
                new MaintenanceLogQuery { SortBy = "odometer" },
                CancellationToken.None));
    }

    [Test]
    public async Task Create_WithExistingLocationId_AttachesAndTouchesUsage()
    {
        var v = await CreateVehicleAsync();
        var loc = await CreateLocationAsync();

        var request = TestRequest();
        request.LocationId = loc.Id;

        var result = await _controller.Create(v.Id, request, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<CreatedAtActionResult>());
        var dto = (MaintenanceLogDto)((CreatedAtActionResult)result.Result!).Value!;
        Assert.That(dto.Location, Is.Not.Null);
        Assert.That(dto.Location!.Id, Is.EqualTo(loc.Id));

        var refreshed = await _db.Locations.SingleAsync(l => l.Id == loc.Id);
        Assert.That(refreshed.UseCount, Is.EqualTo(1));
        Assert.That(refreshed.LastUsedAt, Is.Not.Null);
    }

    [Test]
    public async Task Create_RejectsBothLocationIdAndInlineLocation()
    {
        var v = await CreateVehicleAsync();
        var loc = await CreateLocationAsync();

        var request = TestRequest();
        request.LocationId = loc.Id;
        request.Location = new CreateLocationRequest { Name = "Other" };

        var result = await _controller.Create(v.Id, request, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<ObjectResult>());
        Assert.That(((ObjectResult)result.Result!).Value, Is.InstanceOf<ValidationProblemDetails>());
    }

    [Test]
    public async Task Update_ChangingLocation_DecrementsOldAndIncrementsNew()
    {
        var v = await CreateVehicleAsync();
        var oldLoc = await CreateLocationAsync("Old Shop");
        var newLoc = await CreateLocationAsync("New Shop");

        var create = TestRequest();
        create.LocationId = oldLoc.Id;
        var created = (MaintenanceLogDto)((CreatedAtActionResult)(await _controller.Create(
            v.Id, create, CancellationToken.None)).Result!).Value!;

        Assert.That((await _db.Locations.FindAsync(oldLoc.Id))!.UseCount, Is.EqualTo(1));

        var update = new UpdateMaintenanceLogRequest
        {
            ServiceDate = new DateOnly(2026, 2, 1),
            OdometerReading = 2000,
            ServiceType = "OilChange",
            PerformedBy = "Shop",
            LocationId = newLoc.Id,
        };
        await _controller.Update(v.Id, created.Id, update, CancellationToken.None);

        Assert.That((await _db.Locations.FindAsync(oldLoc.Id))!.UseCount, Is.EqualTo(0));
        Assert.That((await _db.Locations.FindAsync(newLoc.Id))!.UseCount, Is.EqualTo(1));
    }

    [Test]
    public async Task Delete_SoftDeletes_AndDecrementsLocationUsage()
    {
        var v = await CreateVehicleAsync();
        var loc = await CreateLocationAsync();

        var create = TestRequest();
        create.LocationId = loc.Id;
        var created = (MaintenanceLogDto)((CreatedAtActionResult)(await _controller.Create(
            v.Id, create, CancellationToken.None)).Result!).Value!;

        var deleteResult = await _controller.Delete(v.Id, created.Id, CancellationToken.None);

        Assert.That(deleteResult, Is.InstanceOf<NoContentResult>());
        Assert.That((await _db.Locations.FindAsync(loc.Id))!.UseCount, Is.EqualTo(0));

        var getResult = await _controller.GetById(v.Id, created.Id, CancellationToken.None);
        Assert.That(getResult.Result, Is.InstanceOf<NotFoundResult>());

        var raw = await _db.MaintenanceLogs.IgnoreQueryFilters().SingleAsync(m => m.Id == created.Id);
        Assert.That(raw.IsDeleted, Is.True);
    }

    [Test]
    public async Task Delete_CascadesWhenVehicleDeleted()
    {
        var v = await CreateVehicleAsync();
        await _controller.Create(v.Id, TestRequest(), CancellationToken.None);

        _db.Vehicles.Remove(v);
        await _db.SaveChangesAsync();

        var remaining = await _db.MaintenanceLogs.IgnoreQueryFilters().CountAsync(m => m.VehicleId == v.Id);
        Assert.That(remaining, Is.EqualTo(0));
    }

    [Test]
    public async Task GetById_ComputesTotalCost_FromPartsAndLabor()
    {
        var v = await CreateVehicleAsync();
        var request = TestRequest();
        request.PartsCost = 20.00m;
        request.LaborCost = 15.00m;

        var created = (MaintenanceLogDto)((CreatedAtActionResult)(await _controller.Create(
            v.Id, request, CancellationToken.None)).Result!).Value!;

        Assert.That(created.ComputedTotalCost, Is.EqualTo(35.00m));
    }
}
