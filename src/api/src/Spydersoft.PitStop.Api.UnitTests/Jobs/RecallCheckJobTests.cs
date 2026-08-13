using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NUnit.Framework;
using Spydersoft.PitStop.Api.Jobs;
using Spydersoft.PitStop.Api.Services.Nhtsa;
using Spydersoft.PitStop.Api.UnitTests.Support;
using Spydersoft.PitStop.Contracts.Recalls;
using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.Data.Entities;
using Spydersoft.Notification.Contracts;

namespace Spydersoft.PitStop.Api.UnitTests.Jobs;

[TestFixture]
public class RecallCheckJobTests
{
    private static RecallCheckJob CreateJob(IServiceScopeFactory scopeFactory, int intervalHours = 24) =>
        new(scopeFactory, Options.Create(new RecallCheckOptions { IntervalHours = intervalHours }), NullLogger<RecallCheckJob>.Instance);

    [Test]
    public async Task ExecuteAsync_RunsTheRecallCheck_ImmediatelyOnStart()
    {
        var dbOptions = new DbContextOptionsBuilder<PitStopDbContext>()
            .UseInMemoryDatabase($"recall-job-tests-{Guid.NewGuid()}")
            .Options;
        var services = new ServiceCollection();
        services.AddScoped(_ => new PitStopDbContext(dbOptions));
        var recallClient = new FakeNhtsaRecallClient
        {
            NextResult = [new RecallDto { CampaignNumber = "22V123000", Summary = "Steering issue" }],
        };
        var notificationClient = new FakeNotificationClient();
        services.AddSingleton<IVinDecoderClient>(new FakeVinDecoderClient());
        services.AddSingleton<INhtsaRecallClient>(recallClient);
        services.AddSingleton<INotificationClient>(notificationClient);
        services.AddScoped<RecallCheckRunner>();
        services.AddLogging();
        await using var provider = services.BuildServiceProvider();

        using (var scope = provider.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PitStopDbContext>();
            db.Vehicles.Add(new Vehicle
            {
                OwnerId = "owner-1",
                Name = "Mine",
                Year = 2022,
                Make = "Honda",
                Model = "Accord",
                InitialOdometer = 0,
                StartDate = new DateOnly(2022, 1, 1),
                Vin = "1HGCM82633A123456",
            });
            db.SaveChanges();
        }

        var job = CreateJob(provider.GetRequiredService<IServiceScopeFactory>());

        await job.StartAsync(CancellationToken.None);
        await Task.Delay(200);
        await job.StopAsync(CancellationToken.None);

        Assert.That(notificationClient.CreatedRequests, Has.Count.EqualTo(1));
    }

    [Test]
    public void ExecuteAsync_DoesNotThrow_WhenTheRunnerCannotBeResolved()
    {
        // RecallCheckRunner deliberately not registered -- GetRequiredService throws inside the
        // per-tick scope, exercising the do-while loop's catch-and-log path.
        var services = new ServiceCollection();
        using var provider = services.BuildServiceProvider();
        var job = CreateJob(provider.GetRequiredService<IServiceScopeFactory>());

        Assert.DoesNotThrowAsync(async () =>
        {
            await job.StartAsync(CancellationToken.None);
            await Task.Delay(200);
            await job.StopAsync(CancellationToken.None);
        });
    }
}
