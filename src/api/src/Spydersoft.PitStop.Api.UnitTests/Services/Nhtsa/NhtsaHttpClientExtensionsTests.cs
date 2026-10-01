using System.Net;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http.Resilience;
using NUnit.Framework;
using Spydersoft.PitStop.Api.Services.Nhtsa;
using Spydersoft.PitStop.Api.UnitTests.Support;

namespace Spydersoft.PitStop.Api.UnitTests.Services.Nhtsa;

[TestFixture]
public class NhtsaHttpClientExtensionsTests
{
    // Builds a real HttpClient with the NHTSA resilience pipeline in front of a scripted primary
    // handler, so the ShouldHandle / DelayGenerator lambdas run for real. Backoff is zeroed so the
    // tests don't wait on the default 2s retry delay.
    private static HttpClient CreateClient(StubHttpMessageHandler primary)
    {
        var services = new ServiceCollection();
        services.AddHttpClient("nhtsa", c => c.BaseAddress = new Uri("http://nhtsa.test/"))
            .ConfigurePrimaryHttpMessageHandler(() => primary)
            .AddNhtsaResilienceHandler()
            .Configure(o =>
            {
                o.Retry.Delay = TimeSpan.Zero;
                o.Retry.MaxRetryAttempts = 2;
                o.Retry.UseJitter = false;
            });

        return services.BuildServiceProvider()
            .GetRequiredService<IHttpClientFactory>()
            .CreateClient("nhtsa");
    }

    private static StubHttpMessageHandler Scripted(params HttpStatusCode[] statuses)
    {
        var index = 0;
        return new StubHttpMessageHandler(_ =>
            new HttpResponseMessage(statuses[Math.Min(index++, statuses.Length - 1)]));
    }

    [Test]
    public async Task Retries429_ThenSucceeds()
    {
        var handler = Scripted(HttpStatusCode.TooManyRequests, HttpStatusCode.TooManyRequests, HttpStatusCode.OK);
        using var client = CreateClient(handler);

        using var response = await client.GetAsync("recalls");

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(handler.RequestedUris, Has.Count.EqualTo(3));
    }

    [Test]
    public async Task RetriesTransientServerError_ThenSucceeds()
    {
        var handler = Scripted(HttpStatusCode.ServiceUnavailable, HttpStatusCode.OK);
        using var client = CreateClient(handler);

        using var response = await client.GetAsync("recalls");

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(handler.RequestedUris, Has.Count.EqualTo(2));
    }

    [Test]
    public async Task DoesNotRetryNonTransientClientError()
    {
        var handler = Scripted(HttpStatusCode.BadRequest);
        using var client = CreateClient(handler);

        using var response = await client.GetAsync("recalls");

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        Assert.That(handler.RequestedUris, Has.Count.EqualTo(1));
    }

    [Test]
    public async Task StopsRetrying_WhenAttemptsExhausted()
    {
        var handler = Scripted(HttpStatusCode.TooManyRequests);
        using var client = CreateClient(handler);

        using var response = await client.GetAsync("recalls");

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.TooManyRequests));
        Assert.That(handler.RequestedUris, Has.Count.EqualTo(3)); // initial + 2 retries
    }

    [Test]
    public async Task HonorsRetryAfterHeader_OnRetry()
    {
        var calls = 0;
        var handler = new StubHttpMessageHandler(_ =>
        {
            if (calls++ > 0)
            {
                return new HttpResponseMessage(HttpStatusCode.OK);
            }

            var throttled = new HttpResponseMessage(HttpStatusCode.TooManyRequests);
            throttled.Headers.RetryAfter = new System.Net.Http.Headers.RetryConditionHeaderValue(TimeSpan.FromMilliseconds(300));
            return throttled;
        });
        using var client = CreateClient(handler);

        var started = System.Diagnostics.Stopwatch.StartNew();
        using var response = await client.GetAsync("recalls");
        started.Stop();

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        // Base delay is zero, so any wait here came from the Retry-After header.
        Assert.That(started.Elapsed, Is.GreaterThanOrEqualTo(TimeSpan.FromMilliseconds(250)));
    }
}
