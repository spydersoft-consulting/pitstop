using System.Net;
using Microsoft.Extensions.Http.Resilience;

namespace Spydersoft.PitStop.Api.Services.Nhtsa;

/// <summary>
/// Shared resilience config for the two NHTSA-backed HttpClients (vPIC VIN decode, recallsByVehicle).
/// Extends the standard handler's transient-fault retry predicate to also cover HTTP 429 -- NHTSA
/// doesn't publish a documented rate limit, but does return 429 under sustained load -- and honors
/// a Retry-After header when NHTSA sends one instead of guessing at the backoff.
/// </summary>
public static class NhtsaHttpClientExtensions
{
    public static IHttpStandardResiliencePipelineBuilder AddNhtsaResilienceHandler(this IHttpClientBuilder builder) =>
        builder.AddStandardResilienceHandler(options =>
        {
            options.Retry.ShouldHandle = args => ValueTask.FromResult(
                HttpClientResiliencePredicates.IsTransient(args.Outcome)
                || args.Outcome.Result?.StatusCode == HttpStatusCode.TooManyRequests);

            options.Retry.DelayGenerator = args =>
                ValueTask.FromResult(args.Outcome.Result?.Headers.RetryAfter?.Delta);
        });
}
