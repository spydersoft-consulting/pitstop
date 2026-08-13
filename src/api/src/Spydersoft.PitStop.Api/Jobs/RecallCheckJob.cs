using Microsoft.Extensions.Options;

namespace Spydersoft.PitStop.Api.Jobs;

/// <summary>
/// Runs <see cref="RecallCheckRunner"/> on a fixed interval (default daily; see RecallCheck:IntervalHours).
/// PitStopDbContext and the typed HTTP clients it depends on are scoped, so each tick resolves the
/// runner from a fresh DI scope rather than injecting it directly into this singleton hosted service.
/// </summary>
public class RecallCheckJob(
    IServiceScopeFactory scopeFactory,
    IOptions<RecallCheckOptions> options,
    ILogger<RecallCheckJob> logger) : BackgroundService
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
                var runner = scope.ServiceProvider.GetRequiredService<RecallCheckRunner>();
                await runner.RunAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Recall check run failed");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
