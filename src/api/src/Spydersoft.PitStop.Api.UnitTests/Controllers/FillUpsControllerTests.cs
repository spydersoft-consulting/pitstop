using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;
using Spydersoft.PitStop.Api.Controllers;
using Spydersoft.PitStop.Api.Services;
using Spydersoft.PitStop.Contracts.FillUps;
using Spydersoft.PitStop.Contracts.Locations;
using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.Data.Entities;

namespace Spydersoft.PitStop.Api.UnitTests.Controllers;

[TestFixture]
public class FillUpsControllerTests
{
    private const string TestUserId = "test-user";

    private PitStopDbContext _db = null!;
    private FillUpService _fillUpService = null!;
    private LocationService _locationService = null!;
    private FillUpsController _controller = null!;

    [SetUp]
    public void SetUp()
    {
        // InMemory provider: see LocationsControllerTests for the SQLite/DateTimeOffset rationale.
        var options = new DbContextOptionsBuilder<PitStopDbContext>()
            .UseInMemoryDatabase($"fillup-tests-{Guid.NewGuid()}")
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        _db = new PitStopDbContext(options);
        _fillUpService = new FillUpService(_db);
        _locationService = new LocationService(_db);
        _controller = new FillUpsController(_db, _fillUpService, _locationService)
        {
            ControllerContext = BuildControllerContext(TestUserId)
        };
    }

    [TearDown]
    public void TearDown() => _db.Dispose();

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

    private async Task<Vehicle> CreateVehicleAsync(string ownerId = TestUserId)
    {
        var vehicle = new Vehicle
        {
            OwnerId = ownerId,
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

    private async Task<Location> CreateLocationAsync(
        string name = "Costco",
        string? address = null,
        string ownerId = TestUserId,
        int useCount = 0,
        DateTimeOffset? lastUsedAt = null)
    {
        var location = new Location
        {
            OwnerId = ownerId,
            Name = name,
            Address = address,
            CreatedAt = DateTimeOffset.UtcNow,
            UseCount = useCount,
            LastUsedAt = lastUsedAt,
        };
        _db.Locations.Add(location);
        await _db.SaveChangesAsync();
        return location;
    }

    private static CreateFillUpRequest TestFillUpRequest(decimal odometer = 1000m) => new()
    {
        OdometerReading = odometer,
        GallonsAdded = 10,
        PricePerGallon = 3.50m,
        IsFullFillUp = true,
    };

    [Test]
    public async Task GetAll_ReturnsOnlyFillUpsForVehicle_OwnedByCaller()
    {
        var v = await CreateVehicleAsync();
        _db.FillUps.Add(new FillUp
        {
            VehicleId = v.Id,
            FilledAt = DateTimeOffset.UtcNow,
            OdometerReading = 1000,
            GallonsAdded = 10,
            PricePerGallon = 3.50m,
            TotalCost = 35.00m,
            IsFullFillUp = true
        });
        await _db.SaveChangesAsync();

        var result = await _controller.GetAll(
            v.Id,
            new FillUpListQuery { OrderBy = "odometer" },
            CancellationToken.None);

        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);
        var response = ok!.Value as FillUpListResponse;
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
            new FillUpListQuery { OrderBy = "odometer" },
            CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task Create_ReturnsValidationProblem_WhenBothPriceAndTotalAreNull()
    {
        var v = await CreateVehicleAsync();

        var request = new CreateFillUpRequest
        {
            OdometerReading = 1000,
            GallonsAdded = 10,
            PricePerGallon = null,
            TotalCost = null
        };

        var result = await _controller.Create(v.Id, request, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<ObjectResult>());
        var problem = ((ObjectResult)result.Result!).Value as ValidationProblemDetails;
        Assert.That(problem, Is.Not.Null);
    }

    [Test]
    public async Task Create_PersistsFillUp_WhenRequestIsValid()
    {
        var v = await CreateVehicleAsync();

        var result = await _controller.Create(v.Id, TestFillUpRequest(), CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<CreatedAtActionResult>());
        Assert.That(await _db.FillUps.CountAsync(), Is.EqualTo(1));
    }

    [Test]
    public void GetCurrentUserId_Throws_WhenNoSubClaim()
    {
        _controller.ControllerContext = BuildControllerContext(subClaim: null);

        Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await _controller.GetAll(
                vehicleId: 1,
                new FillUpListQuery { OrderBy = "odometer" },
                CancellationToken.None));
    }

    [Test]
    public async Task Create_WithExistingLocationId_AttachesAndTouchesUsage()
    {
        var v = await CreateVehicleAsync();
        var loc = await CreateLocationAsync();

        var request = TestFillUpRequest();
        request.LocationId = loc.Id;

        var result = await _controller.Create(v.Id, request, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<CreatedAtActionResult>());
        var dto = (FillUpDto)((CreatedAtActionResult)result.Result!).Value!;
        Assert.That(dto.Location, Is.Not.Null);
        Assert.That(dto.Location!.Id, Is.EqualTo(loc.Id));

        var refreshed = await _db.Locations.SingleAsync(l => l.Id == loc.Id);
        Assert.That(refreshed.UseCount, Is.EqualTo(1));
        Assert.That(refreshed.LastUsedAt, Is.Not.Null);
    }

    [Test]
    public async Task Create_WithInlineLocation_CreatesAndAttaches()
    {
        var v = await CreateVehicleAsync();

        var request = TestFillUpRequest();
        request.Location = new CreateLocationRequest
        {
            Name = "New Costco",
            Address = "123 Main",
        };

        var result = await _controller.Create(v.Id, request, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<CreatedAtActionResult>());
        var dto = (FillUpDto)((CreatedAtActionResult)result.Result!).Value!;
        Assert.That(dto.Location, Is.Not.Null);
        Assert.That(dto.Location!.Name, Is.EqualTo("New Costco"));

        var created = await _db.Locations.SingleAsync();
        Assert.That(created.UseCount, Is.EqualTo(1));
    }

    [Test]
    public async Task Create_WithInlineLocationMatchingExisting_ReusesExisting()
    {
        var v = await CreateVehicleAsync();
        var existing = await CreateLocationAsync("Costco", address: "123 Main");

        var request = TestFillUpRequest();
        request.Location = new CreateLocationRequest { Name = "Costco", Address = "123 Main" };

        await _controller.Create(v.Id, request, CancellationToken.None);

        Assert.That(await _db.Locations.CountAsync(), Is.EqualTo(1));
        var refreshed = await _db.Locations.SingleAsync(l => l.Id == existing.Id);
        Assert.That(refreshed.UseCount, Is.EqualTo(1));
    }

    [Test]
    public async Task Create_RejectsBothLocationIdAndInlineLocation()
    {
        var v = await CreateVehicleAsync();
        var loc = await CreateLocationAsync();

        var request = TestFillUpRequest();
        request.LocationId = loc.Id;
        request.Location = new CreateLocationRequest { Name = "Other" };

        var result = await _controller.Create(v.Id, request, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<ObjectResult>());
        Assert.That(((ObjectResult)result.Result!).Value, Is.InstanceOf<ValidationProblemDetails>());
    }

    [Test]
    public async Task Create_RejectsLocationOwnedByAnotherUser()
    {
        var v = await CreateVehicleAsync();
        var loc = await CreateLocationAsync(ownerId: "someone-else");

        var request = TestFillUpRequest();
        request.LocationId = loc.Id;

        var result = await _controller.Create(v.Id, request, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<ObjectResult>());
        var problem = ((ObjectResult)result.Result!).Value as ValidationProblemDetails;
        Assert.That(problem, Is.Not.Null);
    }

    [Test]
    public async Task Update_ChangingLocation_DecrementsOldAndIncrementsNew()
    {
        var v = await CreateVehicleAsync();
        var oldLoc = await CreateLocationAsync("Old");
        var newLoc = await CreateLocationAsync("New");

        var create = TestFillUpRequest();
        create.LocationId = oldLoc.Id;
        var created = (FillUpDto)((CreatedAtActionResult)(await _controller.Create(
            v.Id, create, CancellationToken.None)).Result!).Value!;

        Assert.That((await _db.Locations.FindAsync(oldLoc.Id))!.UseCount, Is.EqualTo(1));

        var update = new FillUpRequest
        {
            FilledAt = DateTimeOffset.UtcNow,
            OdometerReading = 2000,
            GallonsAdded = 10,
            PricePerGallon = 3.50m,
            IsFullFillUp = true,
            LocationId = newLoc.Id,
        };
        await _controller.Update(v.Id, created.Id, update, CancellationToken.None);

        Assert.That((await _db.Locations.FindAsync(oldLoc.Id))!.UseCount, Is.EqualTo(0));
        Assert.That((await _db.Locations.FindAsync(newLoc.Id))!.UseCount, Is.EqualTo(1));
    }

    [Test]
    public async Task Update_ClearingLocation_DecrementsOld()
    {
        var v = await CreateVehicleAsync();
        var loc = await CreateLocationAsync();

        var create = TestFillUpRequest();
        create.LocationId = loc.Id;
        var created = (FillUpDto)((CreatedAtActionResult)(await _controller.Create(
            v.Id, create, CancellationToken.None)).Result!).Value!;

        var update = new FillUpRequest
        {
            FilledAt = DateTimeOffset.UtcNow,
            OdometerReading = 2000,
            GallonsAdded = 10,
            PricePerGallon = 3.50m,
            IsFullFillUp = true,
            // no LocationId, no Location
        };
        await _controller.Update(v.Id, created.Id, update, CancellationToken.None);

        Assert.That((await _db.Locations.FindAsync(loc.Id))!.UseCount, Is.EqualTo(0));
        var fillUp = await _db.FillUps.SingleAsync();
        Assert.That(fillUp.LocationId, Is.Null);
    }

    [Test]
    public async Task Update_SameLocation_DoesNotDoubleIncrement()
    {
        var v = await CreateVehicleAsync();
        var loc = await CreateLocationAsync();

        var create = TestFillUpRequest();
        create.LocationId = loc.Id;
        var created = (FillUpDto)((CreatedAtActionResult)(await _controller.Create(
            v.Id, create, CancellationToken.None)).Result!).Value!;

        var update = new FillUpRequest
        {
            FilledAt = DateTimeOffset.UtcNow,
            OdometerReading = 2100,
            GallonsAdded = 10,
            PricePerGallon = 3.50m,
            IsFullFillUp = true,
            LocationId = loc.Id,
        };
        await _controller.Update(v.Id, created.Id, update, CancellationToken.None);

        Assert.That((await _db.Locations.FindAsync(loc.Id))!.UseCount, Is.EqualTo(1));
    }

    [Test]
    public async Task Delete_DecrementsLocationUsage()
    {
        var v = await CreateVehicleAsync();
        var loc = await CreateLocationAsync();

        var create = TestFillUpRequest();
        create.LocationId = loc.Id;
        var created = (FillUpDto)((CreatedAtActionResult)(await _controller.Create(
            v.Id, create, CancellationToken.None)).Result!).Value!;

        await _controller.Delete(v.Id, created.Id, CancellationToken.None);

        Assert.That((await _db.Locations.FindAsync(loc.Id))!.UseCount, Is.EqualTo(0));
    }
}
