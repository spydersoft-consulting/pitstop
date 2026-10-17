using Microsoft.Extensions.Options;

namespace Spydersoft.PitStop.Api.Jobs;

/// <summary>
/// Runs <see cref="ReminderCheckRunner"/> on a fixed interval (default every 6 hours; see ReminderCheck:IntervalHours).
/// The runner depends on scoped services, so each tick resolves it from a fresh DI scope.
/// </summary>
public class ReminderCheckJob(
    IServiceScopeFactory scopeFactory,
    IOptions<ReminderCheckOptions> options,
    ILogger<ReminderCheckJob> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromHours(Math.Max(1, options.Value.IntervalHours));
        using var timer = new PeriodicTimer(interval);

        do
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var runner = scope.ServiceProvider.GetRequiredService<ReminderCheckRunner>();
                await runner.RunAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Reminder check run failed");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
