using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;
using Spydersoft.PitStop.Api.Controllers;
using Spydersoft.PitStop.Contracts.Vehicles;
using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.Data.Entities;

namespace Spydersoft.PitStop.Api.UnitTests.Controllers;

[TestFixture]
public class VehiclesControllerTests
{
    private const string TestUserId = "test-user";

    private PitStopDbContext _db = null!;
    private VehiclesController _controller = null!;

    [SetUp]
    public void SetUp()
    {
        var options = new DbContextOptionsBuilder<PitStopDbContext>()
            .UseInMemoryDatabase($"vehicles-tests-{Guid.NewGuid()}")
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        _db = new PitStopDbContext(options);
        _controller = new VehiclesController(_db)
        {
            ControllerContext = BuildControllerContext(TestUserId)
        };
    }

    [TearDown]
    public void TearDown()
    {
        _db.Dispose();
    }

    private static ControllerContext BuildControllerContext(string? subClaim)
    {
        var identity = subClaim is null
            ? new ClaimsIdentity()
            : new ClaimsIdentity([new Claim(JwtRegisteredClaimNames.Sub, subClaim)], "Test");

        return new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
    }

    private Vehicle AddVehicle(string name, string ownerId = TestUserId, string? plateState = null, string? plateNumber = null, string? vin = null)
    {
        var vehicle = new Vehicle
        {
            OwnerId = ownerId,
            Name = name,
            Year = 2022,
            Make = "Honda",
            Model = "Accord",
            InitialOdometer = 0,
            StartDate = new DateOnly(2022, 1, 1),
            PlateState = plateState,
            PlateNumber = plateNumber,
            Vin = vin,
        };
        _db.Vehicles.Add(vehicle);
        _db.SaveChanges();
        return vehicle;
    }

    private static CreateVehicleRequest ValidCreateRequest(string name = "Daily Driver") => new()
    {
        Name = name,
        Year = 2022,
        Make = "Honda",
        Model = "Accord",
        InitialOdometer = 0,
        StartDate = new DateOnly(2022, 1, 1),
    };

    [Test]
    public async Task GetAll_ReturnsOnlyCallerOwnedVehicles()
    {
        AddVehicle("Mine");
        AddVehicle("Theirs", ownerId: "someone-else");

        var result = await _controller.GetAll(CancellationToken.None);

        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);
        var items = ok!.Value as List<VehicleDto>;
        Assert.That(items, Has.Count.EqualTo(1));
        Assert.That(items![0].Name, Is.EqualTo("Mine"));
    }

    [Test]
    public async Task GetById_ReturnsNotFound_WhenOwnerMismatch()
    {
        var v = AddVehicle("Theirs", ownerId: "someone-else");

        var result = await _controller.GetById(v.Id, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task GetById_ReturnsVehicle_WhenOwnedByCaller()
    {
        var v = AddVehicle("Mine", plateState: "CA", plateNumber: "8ABC123", vin: "1HGCM82633A123456");

        var result = await _controller.GetById(v.Id, CancellationToken.None);

        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);
        var dto = ok!.Value as VehicleDto;
        Assert.That(dto!.Name, Is.EqualTo("Mine"));
        Assert.That(dto.PlateState, Is.EqualTo("CA"));
        Assert.That(dto.PlateNumber, Is.EqualTo("8ABC123"));
        Assert.That(dto.Vin, Is.EqualTo("1HGCM82633A123456"));
    }

    [Test]
    public async Task Create_PersistsNewVehicle_IncludingPlateFields()
    {
        var request = ValidCreateRequest();
        request.PlateState = "WA";
        request.PlateNumber = "XYZ789";

        var result = await _controller.Create(request, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<CreatedAtActionResult>());
        var created = await _db.Vehicles.SingleAsync();
        Assert.That(created.OwnerId, Is.EqualTo(TestUserId));
        Assert.That(created.PlateState, Is.EqualTo("WA"));
        Assert.That(created.PlateNumber, Is.EqualTo("XYZ789"));
    }

    [Test]
    public async Task Create_PersistsNewVehicle_IncludingVin()
    {
        var request = ValidCreateRequest();
        request.Vin = "1HGCM82633A123456";

        var result = await _controller.Create(request, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<CreatedAtActionResult>());
        var created = await _db.Vehicles.SingleAsync();
        Assert.That(created.Vin, Is.EqualTo("1HGCM82633A123456"));
    }

    [Test]
    public async Task Create_AllowsNullPlateFields()
    {
        var result = await _controller.Create(ValidCreateRequest(), CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<CreatedAtActionResult>());
        var created = await _db.Vehicles.SingleAsync();
        Assert.That(created.PlateState, Is.Null);
        Assert.That(created.PlateNumber, Is.Null);
        Assert.That(created.Vin, Is.Null);
    }

    [Test]
    public async Task Update_ReturnsNotFound_WhenOwnerMismatch()
    {
        var v = AddVehicle("Theirs", ownerId: "someone-else");

        var result = await _controller.Update(
            v.Id,
            new UpdateVehicleRequest { Name = "Renamed", Make = "Honda", Model = "Accord" },
            CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task Update_UpdatesFields_IncludingPlateFields()
    {
        var v = AddVehicle("Mine", plateState: "CA", plateNumber: "OLD123");

        var result = await _controller.Update(
            v.Id,
            new UpdateVehicleRequest
            {
                Name = "Renamed",
                Year = 2023,
                Make = "Honda",
                Model = "Civic",
                PlateState = "NY",
                PlateNumber = "NEW456",
            },
            CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
        var updated = await _db.Vehicles.SingleAsync();
        Assert.That(updated.Name, Is.EqualTo("Renamed"));
        Assert.That(updated.Model, Is.EqualTo("Civic"));
        Assert.That(updated.PlateState, Is.EqualTo("NY"));
        Assert.That(updated.PlateNumber, Is.EqualTo("NEW456"));
    }

    [Test]
    public async Task Update_UpdatesVin()
    {
        var v = AddVehicle("Mine", vin: "1HGCM82633A123456");

        var result = await _controller.Update(
            v.Id,
            new UpdateVehicleRequest
            {
                Name = "Mine",
                Make = "Honda",
                Model = "Accord",
                Vin = "2HGCM82633A654321",
            },
            CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
        var updated = await _db.Vehicles.SingleAsync();
        Assert.That(updated.Vin, Is.EqualTo("2HGCM82633A654321"));
    }

    [Test]
    public async Task Update_ClearsPlateFields_WhenOmitted()
    {
        var v = AddVehicle("Mine", plateState: "CA", plateNumber: "OLD123", vin: "1HGCM82633A123456");

        await _controller.Update(
            v.Id,
            new UpdateVehicleRequest { Name = "Mine", Make = "Honda", Model = "Accord" },
            CancellationToken.None);

        var updated = await _db.Vehicles.SingleAsync();
        Assert.That(updated.PlateState, Is.Null);
        Assert.That(updated.PlateNumber, Is.Null);
        Assert.That(updated.Vin, Is.Null);
    }

    [Test]
    public async Task Delete_ReturnsNotFound_WhenOwnerMismatch()
    {
        var v = AddVehicle("Theirs", ownerId: "someone-else");

        var result = await _controller.Delete(v.Id, CancellationToken.None);

        Assert.That(result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task Delete_SoftDeletesVehicle()
    {
        var v = AddVehicle("Mine");

        var result = await _controller.Delete(v.Id, CancellationToken.None);

        Assert.That(result, Is.InstanceOf<NoContentResult>());
        var deleted = await _db.Vehicles.IgnoreQueryFilters().SingleAsync();
        Assert.That(deleted.IsDeleted, Is.True);
    }

    [Test]
    public async Task GetAll_ExcludesSoftDeletedVehicles()
    {
        var v = AddVehicle("Deleted");
        v.IsDeleted = true;
        await _db.SaveChangesAsync();

        var result = await _controller.GetAll(CancellationToken.None);

        var items = (result.Result as OkObjectResult)!.Value as List<VehicleDto>;
        Assert.That(items, Is.Empty);
    }
}
