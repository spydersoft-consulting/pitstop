using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;
using Spydersoft.PitStop.Api.Controllers;
using Spydersoft.PitStop.Api.Services;
using Spydersoft.PitStop.Contracts.Locations;
using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.Data.Entities;

namespace Spydersoft.PitStop.Api.UnitTests.Controllers;

[TestFixture]
public class LocationsControllerTests
{
    private const string TestUserId = "test-user";

    private PitStopDbContext _db = null!;
    private LocationService _service = null!;
    private LocationsController _controller = null!;

    [SetUp]
    public void SetUp()
    {
        // InMemory provider is used here (rather than the SQLite pattern used elsewhere) because
        // SQLite doesn't support ORDER BY on DateTimeOffset columns, which the "recent" sort path
        // exercises. Production runs on Postgres, which has no such limitation.
        var options = new DbContextOptionsBuilder<PitStopDbContext>()
            .UseInMemoryDatabase($"locations-tests-{Guid.NewGuid()}")
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        _db = new PitStopDbContext(options);
        _service = new LocationService(_db);
        _controller = new LocationsController(_db, _service)
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

    private Location AddLocation(
        string name,
        string? address = null,
        string ownerId = TestUserId,
        DateTimeOffset? lastUsedAt = null,
        int useCount = 0)
    {
        var location = new Location
        {
            OwnerId = ownerId,
            Name = name,
            Address = address,
            CreatedAt = DateTimeOffset.UtcNow,
            LastUsedAt = lastUsedAt,
            UseCount = useCount,
        };
        _db.Locations.Add(location);
        _db.SaveChanges();
        return location;
    }

    [Test]
    public async Task GetAll_ReturnsOnlyCallerOwnedLocations()
    {
        AddLocation("Mine");
        AddLocation("Theirs", ownerId: "someone-else");

        var result = await _controller.GetAll(new LocationListQuery(), CancellationToken.None);

        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);
        var items = ok!.Value as List<LocationDto>;
        Assert.That(items, Has.Count.EqualTo(1));
        Assert.That(items![0].Name, Is.EqualTo("Mine"));
    }

    [Test]
    public async Task GetAll_OrdersByRecentByDefault()
    {
        AddLocation("Older", lastUsedAt: DateTimeOffset.UtcNow.AddDays(-10));
        AddLocation("Newer", lastUsedAt: DateTimeOffset.UtcNow.AddDays(-1));
        AddLocation("Unused");

        var result = await _controller.GetAll(new LocationListQuery(), CancellationToken.None);

        var items = (result.Result as OkObjectResult)!.Value as List<LocationDto>;
        Assert.That(items, Has.Count.EqualTo(3));
        Assert.That(items![0].Name, Is.EqualTo("Newer"));
        Assert.That(items[1].Name, Is.EqualTo("Older"));
        Assert.That(items[2].Name, Is.EqualTo("Unused"));
    }

    [Test]
    public async Task GetAll_OrdersByName_WhenRequested()
    {
        AddLocation("Costco");
        AddLocation("BP");
        AddLocation("Shell");

        var result = await _controller.GetAll(
            new LocationListQuery { OrderBy = "name" },
            CancellationToken.None);

        var items = (result.Result as OkObjectResult)!.Value as List<LocationDto>;
        Assert.That(items!.Select(i => i.Name), Is.EqualTo(new[] { "BP", "Costco", "Shell" }));
    }

    [Test]
    public async Task GetAll_FiltersBySearchAgainstNameAndAddress()
    {
        AddLocation("Costco Gas — Issaquah", address: "1801 10th Ave NW");
        AddLocation("Shell", address: "Main Street");
        AddLocation("BP", address: "1900 10th Ave SE");

        var result = await _controller.GetAll(
            new LocationListQuery { Search = "10th" },
            CancellationToken.None);

        var items = (result.Result as OkObjectResult)!.Value as List<LocationDto>;
        Assert.That(items, Has.Count.EqualTo(2));
        Assert.That(items!.Select(i => i.Name), Does.Contain("Costco Gas — Issaquah"));
        Assert.That(items!.Select(i => i.Name), Does.Contain("BP"));
    }

    [Test]
    public async Task GetAll_RespectsLimit()
    {
        for (var i = 0; i < 15; i++)
            AddLocation($"Station {i}", lastUsedAt: DateTimeOffset.UtcNow.AddMinutes(-i));

        var result = await _controller.GetAll(
            new LocationListQuery { Limit = 5 },
            CancellationToken.None);

        var items = (result.Result as OkObjectResult)!.Value as List<LocationDto>;
        Assert.That(items, Has.Count.EqualTo(5));
    }

    [Test]
    public async Task GetById_ReturnsNotFound_WhenOwnerMismatch()
    {
        var l = AddLocation("Theirs", ownerId: "someone-else");

        var result = await _controller.GetById(l.Id, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task GetById_ReturnsLocation_WhenOwnedByCaller()
    {
        var l = AddLocation("Mine", address: "123 Main");

        var result = await _controller.GetById(l.Id, CancellationToken.None);

        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);
        var dto = ok!.Value as LocationDto;
        Assert.That(dto!.Name, Is.EqualTo("Mine"));
        Assert.That(dto.Address, Is.EqualTo("123 Main"));
    }

    [Test]
    public async Task Create_PersistsNewLocation()
    {
        var request = new CreateLocationRequest
        {
            Name = "Costco Gas",
            Address = "1801 10th Ave NW",
            Latitude = 47.5301,
            Longitude = -122.0326,
            GooglePlaceId = "ChIJ123",
        };

        var result = await _controller.Create(request, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<CreatedAtActionResult>());
        var created = await _db.Locations.SingleAsync();
        Assert.That(created.OwnerId, Is.EqualTo(TestUserId));
        Assert.That(created.Name, Is.EqualTo("Costco Gas"));
        Assert.That(created.GooglePlaceId, Is.EqualTo("ChIJ123"));
    }

    [Test]
    public async Task Create_TrimsNameAndAddress()
    {
        var result = await _controller.Create(
            new CreateLocationRequest { Name = "  Costco  ", Address = " 1801 10th  " },
            CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<CreatedAtActionResult>());
        var created = await _db.Locations.SingleAsync();
        Assert.That(created.Name, Is.EqualTo("Costco"));
        Assert.That(created.Address, Is.EqualTo("1801 10th"));
    }

    [Test]
    public async Task Create_ReusesExistingLocation_WhenNameAndAddressMatchCaseInsensitively()
    {
        var existing = AddLocation("Costco Gas", address: "1801 10th Ave NW");

        var result = await _controller.Create(
            new CreateLocationRequest { Name = "COSTCO GAS", Address = "1801 10th Ave NW" },
            CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<CreatedAtActionResult>());
        Assert.That(await _db.Locations.CountAsync(), Is.EqualTo(1));
        var created = ((LocationDto)((CreatedAtActionResult)result.Result!).Value!);
        Assert.That(created.Id, Is.EqualTo(existing.Id));
    }

    [Test]
    public async Task Create_BackfillsCoords_WhenExistingRowMissedThem()
    {
        var existing = AddLocation("Costco");
        Assert.That(existing.Latitude, Is.Null);

        await _controller.Create(
            new CreateLocationRequest
            {
                Name = "Costco",
                Latitude = 47.5,
                Longitude = -122.0,
            },
            CancellationToken.None);

        var updated = await _db.Locations.SingleAsync();
        Assert.That(updated.Latitude, Is.EqualTo(47.5));
        Assert.That(updated.Longitude, Is.EqualTo(-122.0));
    }

    [Test]
    public async Task Create_DoesNotReuseLocationOfAnotherOwner()
    {
        AddLocation("Costco", ownerId: "someone-else");

        await _controller.Create(
            new CreateLocationRequest { Name = "Costco" },
            CancellationToken.None);

        Assert.That(await _db.Locations.IgnoreQueryFilters().CountAsync(), Is.EqualTo(2));
    }

    [Test]
    public async Task GetAll_ExcludesSoftDeletedLocations()
    {
        var l = AddLocation("Deleted");
        l.IsDeleted = true;
        await _db.SaveChangesAsync();

        var result = await _controller.GetAll(new LocationListQuery(), CancellationToken.None);

        var items = (result.Result as OkObjectResult)!.Value as List<LocationDto>;
        Assert.That(items, Is.Empty);
    }
}
