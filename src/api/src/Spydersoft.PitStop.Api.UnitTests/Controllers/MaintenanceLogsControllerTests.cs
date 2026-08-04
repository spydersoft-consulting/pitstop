using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;
using Spydersoft.FileStore.Contracts;
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
    private FakeFileStoreClient _fileStore = null!;
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
        _fileStore = new FakeFileStoreClient();
        _controller = new MaintenanceLogsController(_db, _locationService, _fileStore)
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
    public async Task Create_PersistsRecallServiceTypeAndWarrantyFlag()
    {
        var v = await CreateVehicleAsync();

        var request = TestRequest();
        request.ServiceType = "Recall";
        request.IsWarrantyWork = true;

        var result = await _controller.Create(v.Id, request, CancellationToken.None);

        var dto = (MaintenanceLogDto)((CreatedAtActionResult)result.Result!).Value!;
        Assert.That(dto.ServiceType, Is.EqualTo("Recall"));
        Assert.That(dto.IsWarrantyWork, Is.True);
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

    [Test]
    public async Task GetAll_FiltersByStartDateAndEndDate()
    {
        var v = await CreateVehicleAsync();
        await _controller.Create(v.Id, TestRequestWithDate(new DateOnly(2026, 1, 1)), CancellationToken.None);
        await _controller.Create(v.Id, TestRequestWithDate(new DateOnly(2026, 3, 1)), CancellationToken.None);

        var result = await _controller.GetAll(
            v.Id,
            new MaintenanceLogQuery { StartDate = new DateOnly(2026, 2, 1), EndDate = new DateOnly(2026, 4, 1) },
            CancellationToken.None);

        var response = (MaintenanceLogListResponse)((OkObjectResult)result.Result!).Value!;
        Assert.That(response.TotalCount, Is.EqualTo(1));
    }

    [Test]
    public async Task GetAll_FiltersByServiceType_Valid()
    {
        var v = await CreateVehicleAsync();
        await _controller.Create(v.Id, TestRequest(), CancellationToken.None);
        var recall = TestRequest();
        recall.ServiceType = "Recall";
        await _controller.Create(v.Id, recall, CancellationToken.None);

        var result = await _controller.GetAll(
            v.Id,
            new MaintenanceLogQuery { ServiceType = "Recall" },
            CancellationToken.None);

        var response = (MaintenanceLogListResponse)((OkObjectResult)result.Result!).Value!;
        Assert.That(response.TotalCount, Is.EqualTo(1));
        Assert.That(response.Items[0].ServiceType, Is.EqualTo("Recall"));
    }

    [Test]
    public async Task GetAll_ReturnsValidationProblem_WhenServiceTypeFilterInvalid()
    {
        var v = await CreateVehicleAsync();

        var result = await _controller.GetAll(
            v.Id,
            new MaintenanceLogQuery { ServiceType = "NotAType" },
            CancellationToken.None);

        Assert.That(((ObjectResult)result.Result!).Value, Is.InstanceOf<ValidationProblemDetails>());
    }

    [Test]
    public async Task GetAll_FiltersByPerformedBy_Valid()
    {
        var v = await CreateVehicleAsync();
        await _controller.Create(v.Id, TestRequest(), CancellationToken.None);
        var shop = TestRequest();
        shop.PerformedBy = "Shop";
        await _controller.Create(v.Id, shop, CancellationToken.None);

        var result = await _controller.GetAll(
            v.Id,
            new MaintenanceLogQuery { PerformedBy = "Shop" },
            CancellationToken.None);

        var response = (MaintenanceLogListResponse)((OkObjectResult)result.Result!).Value!;
        Assert.That(response.TotalCount, Is.EqualTo(1));
        Assert.That(response.Items[0].PerformedBy, Is.EqualTo("Shop"));
    }

    [Test]
    public async Task GetAll_ReturnsValidationProblem_WhenPerformedByFilterInvalid()
    {
        var v = await CreateVehicleAsync();

        var result = await _controller.GetAll(
            v.Id,
            new MaintenanceLogQuery { PerformedBy = "NotAPerformer" },
            CancellationToken.None);

        Assert.That(((ObjectResult)result.Result!).Value, Is.InstanceOf<ValidationProblemDetails>());
    }

    [Test]
    public async Task GetAll_SortsByOdometerAscending()
    {
        var v = await CreateVehicleAsync();
        await _controller.Create(v.Id, TestRequest(odometer: 2000m), CancellationToken.None);
        await _controller.Create(v.Id, TestRequest(odometer: 1000m), CancellationToken.None);

        var result = await _controller.GetAll(
            v.Id,
            new MaintenanceLogQuery { SortBy = "odometer", Order = "asc" },
            CancellationToken.None);

        var response = (MaintenanceLogListResponse)((OkObjectResult)result.Result!).Value!;
        Assert.That(response.Items[0].OdometerReading, Is.EqualTo(1000m));
        Assert.That(response.Items[1].OdometerReading, Is.EqualTo(2000m));
    }

    [Test]
    public async Task GetAll_SortsByDateAscending()
    {
        var v = await CreateVehicleAsync();
        await _controller.Create(v.Id, TestRequestWithDate(new DateOnly(2026, 3, 1)), CancellationToken.None);
        await _controller.Create(v.Id, TestRequestWithDate(new DateOnly(2026, 1, 1)), CancellationToken.None);

        var result = await _controller.GetAll(
            v.Id,
            new MaintenanceLogQuery { SortBy = "date", Order = "asc" },
            CancellationToken.None);

        var response = (MaintenanceLogListResponse)((OkObjectResult)result.Result!).Value!;
        Assert.That(response.Items[0].ServiceDate, Is.EqualTo(new DateOnly(2026, 1, 1)));
        Assert.That(response.Items[1].ServiceDate, Is.EqualTo(new DateOnly(2026, 3, 1)));
    }

    [Test]
    public async Task GetAll_IncludesOnlyConfirmedAttachments()
    {
        var v = await CreateVehicleAsync();
        var created = (MaintenanceLogDto)((CreatedAtActionResult)(await _controller.Create(
            v.Id, TestRequest(), CancellationToken.None)).Result!).Value!;

        _db.MaintenanceLogAttachments.AddRange(
            new MaintenanceLogAttachment { MaintenanceLogId = created.Id, FileId = Guid.NewGuid(), FileName = "confirmed.pdf", ContentType = "application/pdf", IsConfirmed = true },
            new MaintenanceLogAttachment { MaintenanceLogId = created.Id, FileId = Guid.NewGuid(), FileName = "pending.pdf", ContentType = "application/pdf", IsConfirmed = false });
        await _db.SaveChangesAsync();

        var result = await _controller.GetAll(v.Id, new MaintenanceLogQuery(), CancellationToken.None);

        var response = (MaintenanceLogListResponse)((OkObjectResult)result.Result!).Value!;
        Assert.That(response.Items[0].Attachments, Has.Count.EqualTo(1));
        Assert.That(response.Items[0].Attachments[0].FileName, Is.EqualTo("confirmed.pdf"));
    }

    [Test]
    public async Task GetById_ReturnsNotFound_WhenVehicleNotOwnedByCaller()
    {
        var v = await CreateVehicleAsync(ownerId: "someone-else");

        var result = await _controller.GetById(v.Id, 1, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task GetById_ReturnsNotFound_WhenLogDoesNotExist()
    {
        var v = await CreateVehicleAsync();

        var result = await _controller.GetById(v.Id, 999, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task Update_ReturnsNotFound_WhenVehicleNotOwnedByCaller()
    {
        var v = await CreateVehicleAsync(ownerId: "someone-else");

        var result = await _controller.Update(v.Id, 1, UpdateRequest(), CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task Update_ReturnsValidationProblem_WhenServiceTypeInvalid()
    {
        var v = await CreateVehicleAsync();
        var request = UpdateRequest();
        request.ServiceType = "NotAType";

        var result = await _controller.Update(v.Id, 1, request, CancellationToken.None);

        Assert.That(((ObjectResult)result.Result!).Value, Is.InstanceOf<ValidationProblemDetails>());
    }

    [Test]
    public async Task Update_ReturnsValidationProblem_WhenPerformedByInvalid()
    {
        var v = await CreateVehicleAsync();
        var request = UpdateRequest();
        request.PerformedBy = "NotAPerformer";

        var result = await _controller.Update(v.Id, 1, request, CancellationToken.None);

        Assert.That(((ObjectResult)result.Result!).Value, Is.InstanceOf<ValidationProblemDetails>());
    }

    [Test]
    public async Task Update_ReturnsNotFound_WhenLogDoesNotExist()
    {
        var v = await CreateVehicleAsync();

        var result = await _controller.Update(v.Id, 999, UpdateRequest(), CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task Update_RejectsBothLocationIdAndInlineLocation()
    {
        var v = await CreateVehicleAsync();
        var loc = await CreateLocationAsync();
        var created = (MaintenanceLogDto)((CreatedAtActionResult)(await _controller.Create(
            v.Id, TestRequest(), CancellationToken.None)).Result!).Value!;

        var request = UpdateRequest();
        request.LocationId = loc.Id;
        request.Location = new CreateLocationRequest { Name = "Other" };

        var result = await _controller.Update(v.Id, created.Id, request, CancellationToken.None);

        Assert.That(((ObjectResult)result.Result!).Value, Is.InstanceOf<ValidationProblemDetails>());
    }

    [Test]
    public async Task Delete_ReturnsNotFound_WhenVehicleNotOwnedByCaller()
    {
        var v = await CreateVehicleAsync(ownerId: "someone-else");

        var result = await _controller.Delete(v.Id, 1, CancellationToken.None);

        Assert.That(result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task Delete_ReturnsNotFound_WhenLogDoesNotExist()
    {
        var v = await CreateVehicleAsync();

        var result = await _controller.Delete(v.Id, 999, CancellationToken.None);

        Assert.That(result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task InitiateAttachmentUpload_ReturnsNotFound_WhenVehicleNotOwnedByCaller()
    {
        var v = await CreateVehicleAsync(ownerId: "someone-else");

        var result = await _controller.InitiateAttachmentUpload(v.Id, 1, InitiateRequest(), CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task InitiateAttachmentUpload_ReturnsNotFound_WhenLogDoesNotExist()
    {
        var v = await CreateVehicleAsync();

        var result = await _controller.InitiateAttachmentUpload(v.Id, 999, InitiateRequest(), CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task InitiateAttachmentUpload_CreatesUnconfirmedAttachment_AndReturnsUploadUrl()
    {
        var v = await CreateVehicleAsync();
        var created = (MaintenanceLogDto)((CreatedAtActionResult)(await _controller.Create(
            v.Id, TestRequest(), CancellationToken.None)).Result!).Value!;
        _fileStore.NextUploadUrl = "https://filestore.test/upload/abc";

        var result = await _controller.InitiateAttachmentUpload(v.Id, created.Id, InitiateRequest(), CancellationToken.None);

        var response = ((OkObjectResult)result.Result!).Value as InitiateAttachmentUploadResponse;
        Assert.That(response, Is.Not.Null);
        Assert.That(response!.UploadUrl, Is.EqualTo("https://filestore.test/upload/abc"));

        var stored = await _db.MaintenanceLogAttachments.SingleAsync(a => a.MaintenanceLogId == created.Id);
        Assert.That(stored.IsConfirmed, Is.False);
        Assert.That(stored.FileName, Is.EqualTo("receipt.pdf"));

        Assert.That(_fileStore.LastInitiateRequest!.EntityId, Is.EqualTo(created.Id.ToString()));
    }

    [Test]
    public async Task ConfirmAttachmentUpload_ReturnsNotFound_WhenVehicleNotOwnedByCaller()
    {
        var v = await CreateVehicleAsync(ownerId: "someone-else");

        var result = await _controller.ConfirmAttachmentUpload(v.Id, 1, 1, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task ConfirmAttachmentUpload_ReturnsNotFound_WhenAttachmentDoesNotExist()
    {
        var v = await CreateVehicleAsync();

        var result = await _controller.ConfirmAttachmentUpload(v.Id, 1, 999, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task ConfirmAttachmentUpload_MarksConfirmed_AndCallsFileStore()
    {
        var v = await CreateVehicleAsync();
        var created = (MaintenanceLogDto)((CreatedAtActionResult)(await _controller.Create(
            v.Id, TestRequest(), CancellationToken.None)).Result!).Value!;
        var initiated = ((OkObjectResult)(await _controller.InitiateAttachmentUpload(
            v.Id, created.Id, InitiateRequest(), CancellationToken.None)).Result!).Value as InitiateAttachmentUploadResponse;

        var result = await _controller.ConfirmAttachmentUpload(v.Id, created.Id, initiated!.AttachmentId, CancellationToken.None);

        var dto = ((OkObjectResult)result.Result!).Value as MaintenanceAttachmentDto;
        Assert.That(dto, Is.Not.Null);
        Assert.That(dto!.FileName, Is.EqualTo("receipt.pdf"));

        var stored = await _db.MaintenanceLogAttachments.SingleAsync(a => a.Id == initiated.AttachmentId);
        Assert.That(stored.IsConfirmed, Is.True);
        Assert.That(_fileStore.LastConfirmedFileId, Is.EqualTo(stored.FileId));
    }

    [Test]
    public async Task GetAttachmentUrl_ReturnsNotFound_WhenVehicleNotOwnedByCaller()
    {
        var v = await CreateVehicleAsync(ownerId: "someone-else");

        var result = await _controller.GetAttachmentUrl(v.Id, 1, 1, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task GetAttachmentUrl_ReturnsNotFound_WhenAttachmentNotConfirmed()
    {
        var v = await CreateVehicleAsync();
        var created = (MaintenanceLogDto)((CreatedAtActionResult)(await _controller.Create(
            v.Id, TestRequest(), CancellationToken.None)).Result!).Value!;
        await _controller.InitiateAttachmentUpload(v.Id, created.Id, InitiateRequest(), CancellationToken.None);

        var result = await _controller.GetAttachmentUrl(v.Id, created.Id, 999, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task GetAttachmentUrl_ReturnsUrl_WhenConfirmed()
    {
        var v = await CreateVehicleAsync();
        var created = (MaintenanceLogDto)((CreatedAtActionResult)(await _controller.Create(
            v.Id, TestRequest(), CancellationToken.None)).Result!).Value!;
        var initiated = ((OkObjectResult)(await _controller.InitiateAttachmentUpload(
            v.Id, created.Id, InitiateRequest(), CancellationToken.None)).Result!).Value as InitiateAttachmentUploadResponse;
        await _controller.ConfirmAttachmentUpload(v.Id, created.Id, initiated!.AttachmentId, CancellationToken.None);
        _fileStore.NextDownloadUrl = "https://filestore.test/download/xyz";

        var result = await _controller.GetAttachmentUrl(v.Id, created.Id, initiated.AttachmentId, CancellationToken.None);

        var url = ((OkObjectResult)result.Result!).Value as FileUrlResponse;
        Assert.That(url, Is.Not.Null);
        Assert.That(url!.Url, Is.EqualTo("https://filestore.test/download/xyz"));
    }

    [Test]
    public async Task DeleteAttachment_ReturnsNotFound_WhenVehicleNotOwnedByCaller()
    {
        var v = await CreateVehicleAsync(ownerId: "someone-else");

        var result = await _controller.DeleteAttachment(v.Id, 1, 1, CancellationToken.None);

        Assert.That(result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task DeleteAttachment_ReturnsNotFound_WhenAttachmentDoesNotExist()
    {
        var v = await CreateVehicleAsync();

        var result = await _controller.DeleteAttachment(v.Id, 1, 999, CancellationToken.None);

        Assert.That(result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task DeleteAttachment_RemovesAttachment_AndCallsFileStore()
    {
        var v = await CreateVehicleAsync();
        var created = (MaintenanceLogDto)((CreatedAtActionResult)(await _controller.Create(
            v.Id, TestRequest(), CancellationToken.None)).Result!).Value!;
        var initiated = ((OkObjectResult)(await _controller.InitiateAttachmentUpload(
            v.Id, created.Id, InitiateRequest(), CancellationToken.None)).Result!).Value as InitiateAttachmentUploadResponse;

        var result = await _controller.DeleteAttachment(v.Id, created.Id, initiated!.AttachmentId, CancellationToken.None);

        Assert.That(result, Is.InstanceOf<NoContentResult>());
        Assert.That(await _db.MaintenanceLogAttachments.AnyAsync(a => a.Id == initiated.AttachmentId), Is.False);
        Assert.That(_fileStore.LastDeletedFileId, Is.EqualTo(_fileStore.NextFileId));
    }

    private static CreateMaintenanceLogRequest TestRequestWithDate(DateOnly date)
    {
        var request = TestRequest();
        request.ServiceDate = date;
        return request;
    }

    private static UpdateMaintenanceLogRequest UpdateRequest() => new()
    {
        ServiceDate = new DateOnly(2026, 1, 1),
        OdometerReading = 1500m,
        ServiceType = "OilChange",
        PerformedBy = "Self",
    };

    private static InitiateAttachmentUploadRequest InitiateRequest() => new()
    {
        FileName = "receipt.pdf",
        ContentType = "application/pdf",
        SizeBytes = 1024,
    };
}
