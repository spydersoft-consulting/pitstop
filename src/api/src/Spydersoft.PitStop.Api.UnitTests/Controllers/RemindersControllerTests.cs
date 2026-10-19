using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;
using Spydersoft.PitStop.Api.Controllers;
using Spydersoft.PitStop.Api.Services.Reminders;
using Spydersoft.PitStop.Api.UnitTests.Support;
using Spydersoft.PitStop.Contracts.Reminders;
using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.Data.Entities;

namespace Spydersoft.PitStop.Api.UnitTests.Controllers;

[TestFixture]
public class RemindersControllerTests
{
    private static readonly string[] ExpectedNames = ["Oil", "Battery"];
    private static readonly string[] ExpectedServiceTypes = ["OilChange", "TireRotation"];

    private const string TestUserId = TestDataHelpers.TestUserId;

    private PitStopDbContext _db = null!;
    private RemindersController _controller = null!;

    [SetUp]
    public void SetUp()
    {
        var options = new DbContextOptionsBuilder<PitStopDbContext>()
            .UseInMemoryDatabase($"reminder-tests-{Guid.NewGuid()}")
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        _db = new PitStopDbContext(options);
        var time = new FakeTimeProvider { UtcNow = new DateTimeOffset(2026, 6, 1, 0, 0, 0, TimeSpan.Zero) };
        _controller = new RemindersController(_db, new ReminderService(_db, time))
        {
            ControllerContext = TestDataHelpers.BuildControllerContext(TestUserId)
        };
    }

    [TearDown]
    public void TearDown() => _db.Dispose();

    private static ReminderRequest OilRequest() => new()
    {
        ServiceType = "OilChange",
        IntervalMiles = 5000,
        IntervalMonths = 6,
        LeadMiles = 500,
        LeadDays = 14,
    };

    private static T Value<T>(ActionResult<T> result) =>
        (T)((ObjectResult)result.Result!).Value!;

    [Test]
    public async Task Create_ReturnsEvaluatedReminder_AndDefaultsName()
    {
        var vehicle = await TestDataHelpers.CreateVehicleAsync(_db);

        var result = await _controller.Create(vehicle.Id, OilRequest(), CancellationToken.None);

        var dto = Value(result);
        Assert.That(dto.Name, Is.EqualTo("Oil change"));
        Assert.That(dto.Source, Is.EqualTo("User"));
        Assert.That(dto.NextDueOdometer, Is.EqualTo(5000));
        Assert.That(dto.Status, Is.EqualTo("Overdue"));
        Assert.That(_db.MaintenanceReminders.Count(), Is.EqualTo(1));
    }

    [Test]
    public async Task Create_RejectsRequestWithoutInterval()
    {
        var vehicle = await TestDataHelpers.CreateVehicleAsync(_db);
        var request = OilRequest();
        request.IntervalMiles = null;
        request.IntervalMonths = null;

        var result = await _controller.Create(vehicle.Id, request, CancellationToken.None);

        Assert.That(((ObjectResult)result.Result!).Value, Is.InstanceOf<ValidationProblemDetails>());
        Assert.That(_db.MaintenanceReminders.Count(), Is.Zero);
    }

    [TestCase(1_000_001, null, null, null)]
    [TestCase(null, 1_201, null, null)]
    [TestCase(5000, 6, 1_000_001, null)]
    [TestCase(5000, 6, null, 3_651)]
    [TestCase(null, 200_000, null, null)]
    public async Task Create_RejectsIntervalsAndLeadTimesTooLargeToCalculate(
        int? miles, int? months, int? leadMiles, int? leadDays)
    {
        var vehicle = await TestDataHelpers.CreateVehicleAsync(_db);
        var request = OilRequest();
        request.IntervalMiles = miles;
        request.IntervalMonths = months;
        request.LeadMiles = leadMiles;
        request.LeadDays = leadDays;

        var result = await _controller.Create(vehicle.Id, request, CancellationToken.None);

        Assert.That(((ObjectResult)result.Result!).Value, Is.InstanceOf<ValidationProblemDetails>());
        Assert.That(_db.MaintenanceReminders.Count(), Is.Zero);
    }

    [Test]
    public async Task Create_AcceptsTheLargestAllowedValues()
    {
        var vehicle = await TestDataHelpers.CreateVehicleAsync(_db);
        var request = OilRequest();
        request.IntervalMiles = 1_000_000;
        request.IntervalMonths = 1_200;
        request.LeadMiles = 1_000_000;
        request.LeadDays = 3_650;

        var result = await _controller.Create(vehicle.Id, request, CancellationToken.None);

        Assert.That(Value(result).IntervalMonths, Is.EqualTo(1_200));
    }

    [Test]
    public async Task Create_RejectsUnknownServiceType()
    {
        var vehicle = await TestDataHelpers.CreateVehicleAsync(_db);
        var request = OilRequest();
        request.ServiceType = "Nope";

        var result = await _controller.Create(vehicle.Id, request, CancellationToken.None);

        Assert.That(((ObjectResult)result.Result!).Value, Is.InstanceOf<ValidationProblemDetails>());
    }

    [Test]
    public async Task Create_ReturnsNotFound_ForAnotherOwnersVehicle()
    {
        var vehicle = await TestDataHelpers.CreateVehicleAsync(_db, "someone-else");

        var result = await _controller.Create(vehicle.Id, OilRequest(), CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task GetAll_ReturnsOverdueFirst()
    {
        var vehicle = await TestDataHelpers.CreateVehicleAsync(_db);
        vehicle.InitialOdometer = 0;
        _db.MaintenanceReminders.AddRange(
            new MaintenanceReminder { VehicleId = vehicle.Id, ServiceType = MaintenanceType.Battery, Name = "Battery", IntervalMonths = 120 },
            new MaintenanceReminder { VehicleId = vehicle.Id, ServiceType = MaintenanceType.OilChange, Name = "Oil", IntervalMonths = 6 });
        await _db.SaveChangesAsync();

        var result = await _controller.GetAll(vehicle.Id, CancellationToken.None);

        var list = Value(result);
        Assert.That(list.Select(r => r.Name), Is.EqualTo(ExpectedNames));
        Assert.That(list[0].Status, Is.EqualTo("Overdue"));
    }

    [Test]
    public async Task GetAll_UsesLatestMatchingMaintenanceLogAsBaseline()
    {
        var vehicle = await TestDataHelpers.CreateVehicleAsync(_db);
        _db.MaintenanceLogs.Add(new MaintenanceLog
        {
            VehicleId = vehicle.Id,
            ServiceDate = new DateOnly(2026, 5, 20),
            OdometerReading = 30000,
            Items = [new MaintenanceLogItem { ServiceType = MaintenanceType.OilChange }],
        });
        _db.MaintenanceReminders.Add(new MaintenanceReminder
        {
            VehicleId = vehicle.Id,
            ServiceType = MaintenanceType.OilChange,
            Name = "Oil",
            IntervalMiles = 5000,
        });
        await _db.SaveChangesAsync();

        var dto = Value(await _controller.GetAll(vehicle.Id, CancellationToken.None)).Single();

        Assert.That(dto.LastServiceOdometer, Is.EqualTo(30000));
        Assert.That(dto.NextDueOdometer, Is.EqualTo(35000));
    }

    [Test]
    public async Task Complete_ResetsBaseline_AndClearsSnooze()
    {
        var vehicle = await TestDataHelpers.CreateVehicleAsync(_db);
        var created = Value(await _controller.Create(vehicle.Id, OilRequest(), CancellationToken.None));
        await _controller.Snooze(vehicle.Id, created.Id, new SnoozeReminderRequest { Until = new DateOnly(2026, 7, 1) }, CancellationToken.None);

        var result = await _controller.Complete(
            vehicle.Id, created.Id, new CompleteReminderRequest { Date = new DateOnly(2026, 5, 30), Odometer = 42000 }, CancellationToken.None);

        var dto = Value(result);
        Assert.That(dto.LastServiceOdometer, Is.EqualTo(42000));
        Assert.That(dto.NextDueOdometer, Is.EqualTo(47000));
        Assert.That(dto.SnoozedUntil, Is.Null);
    }

    [Test]
    public async Task Complete_RecordsAMaintenanceLogForTheReminderService()
    {
        var vehicle = await TestDataHelpers.CreateVehicleAsync(_db);
        var created = Value(await _controller.Create(vehicle.Id, OilRequest(), CancellationToken.None));

        await _controller.Complete(
            vehicle.Id,
            created.Id,
            new CompleteReminderRequest { Date = new DateOnly(2026, 5, 30), Odometer = 42000, PerformedBy = "Shop" },
            CancellationToken.None);

        var log = _db.MaintenanceLogs.Include(m => m.Items).Single();
        Assert.That(log.VehicleId, Is.EqualTo(vehicle.Id));
        Assert.That(log.ServiceDate, Is.EqualTo(new DateOnly(2026, 5, 30)));
        Assert.That(log.OdometerReading, Is.EqualTo(42000));
        Assert.That(log.PerformedBy, Is.EqualTo(ServicePerformedBy.Shop));
        Assert.That(log.Items.Select(i => i.ServiceType), Is.EqualTo(new[] { MaintenanceType.OilChange }));
        Assert.That(log.Items[0].Description, Is.Null);
    }

    [Test]
    public async Task Complete_DescribesOtherServicesByReminderName()
    {
        var vehicle = await TestDataHelpers.CreateVehicleAsync(_db);
        var request = OilRequest();
        request.ServiceType = "Other";
        request.Name = "Rotate spare";
        var created = Value(await _controller.Create(vehicle.Id, request, CancellationToken.None));

        await _controller.Complete(
            vehicle.Id, created.Id, new CompleteReminderRequest { Date = new DateOnly(2026, 5, 30), Odometer = 42000 }, CancellationToken.None);

        var item = _db.MaintenanceLogs.Include(m => m.Items).Single().Items.Single();
        Assert.That(item.ServiceType, Is.EqualTo(MaintenanceType.Other));
        Assert.That(item.Description, Is.EqualTo("Rotate spare"));
    }

    [Test]
    public async Task Complete_RejectsInvalidPerformedBy_WithoutRecordingAnything()
    {
        var vehicle = await TestDataHelpers.CreateVehicleAsync(_db);
        var created = Value(await _controller.Create(vehicle.Id, OilRequest(), CancellationToken.None));

        var result = await _controller.Complete(
            vehicle.Id,
            created.Id,
            new CompleteReminderRequest { Date = new DateOnly(2026, 5, 30), Odometer = 42000, PerformedBy = "Nobody" },
            CancellationToken.None);

        Assert.That(((ObjectResult)result.Result!).Value, Is.InstanceOf<ValidationProblemDetails>());
        Assert.That(_db.MaintenanceLogs.Count(), Is.Zero);
    }

    private void AddLog(int vehicleId, string date, int odometer, MaintenanceType type = MaintenanceType.OilChange) =>
        _db.MaintenanceLogs.Add(new MaintenanceLog
        {
            VehicleId = vehicleId,
            ServiceDate = DateOnly.Parse(date),
            OdometerReading = odometer,
            Items = [new MaintenanceLogItem { ServiceType = type }],
        });

    [Test]
    public async Task GetHistory_ListsMatchingLogsNewestFirstWithLateness()
    {
        var vehicle = await TestDataHelpers.CreateVehicleAsync(_db);
        var created = Value(await _controller.Create(vehicle.Id, OilRequest(), CancellationToken.None));
        AddLog(vehicle.Id, "2026-01-10", 12000);
        AddLog(vehicle.Id, "2026-07-22", 15000);
        AddLog(vehicle.Id, "2026-03-01", 13000, MaintenanceType.TireRotation);
        await _db.SaveChangesAsync();

        var history = Value(await _controller.GetHistory(vehicle.Id, created.Id, CancellationToken.None));

        Assert.That(history.Select(h => h.ServiceDate), Is.EqualTo(new[] { new DateOnly(2026, 7, 22), new DateOnly(2026, 1, 10) }));
        Assert.That(history[0].DaysLate, Is.EqualTo(12));
        Assert.That(history[0].WasLate, Is.True);
        Assert.That(history[1].DueDate, Is.Null);
    }

    [Test]
    public async Task GetHistory_IsEmptyForOtherServices()
    {
        var vehicle = await TestDataHelpers.CreateVehicleAsync(_db);
        var request = OilRequest();
        request.ServiceType = "Other";
        var created = Value(await _controller.Create(vehicle.Id, request, CancellationToken.None));
        AddLog(vehicle.Id, "2026-01-10", 12000, MaintenanceType.Other);
        await _db.SaveChangesAsync();

        var history = Value(await _controller.GetHistory(vehicle.Id, created.Id, CancellationToken.None));

        Assert.That(history, Is.Empty);
    }

    [Test]
    public async Task GetHistory_ReturnsNotFound_ForAnotherOwnersVehicle()
    {
        var vehicle = await TestDataHelpers.CreateVehicleAsync(_db, "someone-else");

        var result = await _controller.GetHistory(vehicle.Id, 1, CancellationToken.None);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task Snooze_SetsAndClears()
    {
        var vehicle = await TestDataHelpers.CreateVehicleAsync(_db);
        var created = Value(await _controller.Create(vehicle.Id, OilRequest(), CancellationToken.None));

        var snoozed = Value(await _controller.Snooze(vehicle.Id, created.Id, new SnoozeReminderRequest { Until = new DateOnly(2026, 7, 1) }, CancellationToken.None));
        var cleared = Value(await _controller.Snooze(vehicle.Id, created.Id, new SnoozeReminderRequest(), CancellationToken.None));

        Assert.That(snoozed.Status, Is.EqualTo("Snoozed"));
        Assert.That(cleared.SnoozedUntil, Is.Null);
    }

    [Test]
    public async Task Update_ChangesIntervals()
    {
        var vehicle = await TestDataHelpers.CreateVehicleAsync(_db);
        var created = Value(await _controller.Create(vehicle.Id, OilRequest(), CancellationToken.None));
        var request = OilRequest();
        request.IntervalMiles = 7500;

        var dto = Value(await _controller.Update(vehicle.Id, created.Id, request, CancellationToken.None));

        Assert.That(dto.IntervalMiles, Is.EqualTo(7500));
    }

    [Test]
    public async Task Delete_RemovesReminder()
    {
        var vehicle = await TestDataHelpers.CreateVehicleAsync(_db);
        var created = Value(await _controller.Create(vehicle.Id, OilRequest(), CancellationToken.None));

        var result = await _controller.Delete(vehicle.Id, created.Id, CancellationToken.None);

        Assert.That(result, Is.InstanceOf<NoContentResult>());
        Assert.That(_db.MaintenanceReminders.Count(), Is.Zero);
    }

    [Test]
    public async Task CreateFromTemplates_CreatesTemplateSourcedReminders()
    {
        var vehicle = await TestDataHelpers.CreateVehicleAsync(_db);

        var result = await _controller.CreateFromTemplates(
            vehicle.Id, new CreateRemindersFromTemplatesRequest { ServiceTypes = ["OilChange", "TireRotation"] }, CancellationToken.None);

        var list = Value(result);
        Assert.That(list.Select(r => r.ServiceType), Is.EquivalentTo(ExpectedServiceTypes));
        Assert.That(list, Has.All.Property("Source").EqualTo("Template"));
    }

    [Test]
    public async Task CreateFromTemplates_RejectsServiceTypeWithoutTemplate()
    {
        var vehicle = await TestDataHelpers.CreateVehicleAsync(_db);

        var result = await _controller.CreateFromTemplates(
            vehicle.Id, new CreateRemindersFromTemplatesRequest { ServiceTypes = ["Recall"] }, CancellationToken.None);

        Assert.That(((ObjectResult)result.Result!).Value, Is.InstanceOf<ValidationProblemDetails>());
        Assert.That(_db.MaintenanceReminders.Count(), Is.Zero);
    }

    [Test]
    public void GetTemplates_ListsAllTemplates()
    {
        var templates = Value(_controller.GetTemplates());

        Assert.That(templates, Has.Count.EqualTo(ReminderTemplates.All.Count));
        Assert.That(templates.Select(t => t.ServiceType), Does.Contain("OilChange"));
    }
}
