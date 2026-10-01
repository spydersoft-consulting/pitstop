using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;
using Polly.CircuitBreaker;
using Polly.Timeout;
using Spydersoft.PitStop.Api.Controllers;
using Spydersoft.PitStop.Api.UnitTests.Support;
using Spydersoft.PitStop.Contracts.Recalls;
using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.Data.Entities;

namespace Spydersoft.PitStop.Api.UnitTests.Controllers;

[TestFixture]
public class RecallsControllerTests
{
    private const string TestUserId = "test-user";

    private PitStopDbContext _db = null!;
    private FakeVinDecoderClient _vinDecoder = null!;
    private FakeNhtsaRecallClient _recallClient = null!;
    private RecallsController _controller = null!;

    [SetUp]
    public void SetUp()
    {
        var options = new DbContextOptionsBuilder<PitStopDbContext>()
            .UseInMemoryDatabase($"recalls-tests-{Guid.NewGuid()}")
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        _db = new PitStopDbContext(options);
        _vinDecoder = new FakeVinDecoderClient();
        _recallClient = new FakeNhtsaRecallClient();
        _controller = new RecallsController(_db, _vinDecoder, _recallClient)
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

    private Vehicle AddVehicle(string name, string ownerId = TestUserId, string? vin = "1HGCM82633A123456")
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
            Vin = vin,
        };
        _db.Vehicles.Add(vehicle);
        _db.SaveChanges();
        return vehicle;
    }

    [Test]
    public async Task GetAll_ReturnsNotFound_WhenOwnerMismatch()
    {
        var v = AddVehicle("Theirs", ownerId: "someone-else");

        var result = await _controller.GetAll(v.Id, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task GetAll_ReturnsNotFound_WhenVehicleDoesNotExist()
    {
        var result = await _controller.GetAll(999, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task GetAll_ReturnsValidationProblem_WhenVehicleHasNoVin()
    {
        var v = AddVehicle("Mine", vin: null);

        var result = await _controller.GetAll(v.Id, CancellationToken.None);

        Assert.That(((ObjectResult)result.Result!).Value, Is.InstanceOf<ValidationProblemDetails>());
    }

    [Test]
    public async Task GetAll_DecodesVin_AndQueriesRecallsByDecodedMakeModelYear()
    {
        // Stored vehicle fields intentionally differ from the decoded VIN result, to prove
        // the recall query uses the VIN-decoded values rather than the vehicle's own fields.
        var v = AddVehicle("Mine");
        _vinDecoder.NextResult = new("Toyota", "Camry", 2019);
        _recallClient.NextResult =
        [
            new RecallDto { CampaignNumber = "22V123000", Component = "STEERING", Summary = "Test recall" }
        ];

        var result = await _controller.GetAll(v.Id, CancellationToken.None);

        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);
        var recalls = ok!.Value as List<RecallDto>;
        Assert.That(recalls, Has.Count.EqualTo(1));
        Assert.That(recalls![0].CampaignNumber, Is.EqualTo("22V123000"));
        Assert.That(_vinDecoder.LastVin, Is.EqualTo(v.Vin));
        Assert.That(_recallClient.LastQuery, Is.EqualTo(("Toyota", "Camry", 2019)));
    }

    [Test]
    public async Task GetAll_ReturnsValidationProblem_WhenVinCannotBeDecoded()
    {
        var v = AddVehicle("Mine");
        _vinDecoder.NextResult = null;

        var result = await _controller.GetAll(v.Id, CancellationToken.None);

        Assert.That(((ObjectResult)result.Result!).Value, Is.InstanceOf<ValidationProblemDetails>());
        Assert.That(_recallClient.LastQuery, Is.Null);
    }

    // Covers both a direct HTTP failure and the exceptions the NHTSA clients' resilience pipeline
    // throws once its retries are exhausted (BrokenCircuitException when the circuit is open,
    // TimeoutRejectedException when the per-attempt/total timeout elapses) -- all four should
    // surface identically as a clean 502, not an unhandled 500.
    private static readonly object[] TransientFailures =
    [
        new HttpRequestException("boom"),
        new InvalidOperationException("boom"),
        new BrokenCircuitException("circuit open"),
        new TimeoutRejectedException("attempt timed out"),
    ];

    [TestCaseSource(nameof(TransientFailures))]
    public async Task GetAll_ReturnsBadGateway_WhenVinDecodeServiceUnavailable(Exception failure)
    {
        var v = AddVehicle("Mine");
        _vinDecoder.FailWith = failure;

        var result = await _controller.GetAll(v.Id, CancellationToken.None);

        var problem = result.Result as ObjectResult;
        Assert.That(problem, Is.Not.Null);
        Assert.That(problem!.StatusCode, Is.EqualTo(StatusCodes.Status502BadGateway));
        Assert.That(_recallClient.LastQuery, Is.Null);
    }

    [TestCaseSource(nameof(TransientFailures))]
    public async Task GetAll_ReturnsBadGateway_WhenRecallServiceUnavailable(Exception failure)
    {
        var v = AddVehicle("Mine");
        _recallClient.FailWith = failure;

        var result = await _controller.GetAll(v.Id, CancellationToken.None);

        var problem = result.Result as ObjectResult;
        Assert.That(problem, Is.Not.Null);
        Assert.That(problem!.StatusCode, Is.EqualTo(StatusCodes.Status502BadGateway));
    }
}
