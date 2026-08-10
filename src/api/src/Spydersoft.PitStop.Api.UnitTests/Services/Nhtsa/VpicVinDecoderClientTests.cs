using System.Net;
using System.Text;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using NUnit.Framework;
using Spydersoft.PitStop.Api.Services.Nhtsa;
using Spydersoft.PitStop.Api.UnitTests.Support;

namespace Spydersoft.PitStop.Api.UnitTests.Services.Nhtsa;

[TestFixture]
public class VpicVinDecoderClientTests
{
    private static HttpResponseMessage JsonResponse(string json) =>
        new(HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") };

    private static VpicVinDecoderClient CreateClient(StubHttpMessageHandler handler, IMemoryCache cache, IConfiguration? configuration = null)
    {
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("http://vpic.test/") };
        return new VpicVinDecoderClient(httpClient, cache, configuration ?? new ConfigurationBuilder().Build());
    }

    [Test]
    public async Task DecodeAsync_ReturnsDecodedResult_OnSuccessfulResponse()
    {
        var handler = new StubHttpMessageHandler(_ => JsonResponse(
            """{"Results":[{"Make":"Ford","Model":"Bronco","ModelYear":"2024"}]}"""));
        var client = CreateClient(handler, new MemoryCache(new MemoryCacheOptions()));

        var result = await client.DecodeAsync("1FMEE5DP5NLA12345", CancellationToken.None);

        Assert.That(result, Is.Not.Null);
        Assert.That(result!.Make, Is.EqualTo("Ford"));
        Assert.That(result.Model, Is.EqualTo("Bronco"));
        Assert.That(result.ModelYear, Is.EqualTo(2024));
    }

    [Test]
    public async Task DecodeAsync_ReturnsNull_WhenResultsEmpty()
    {
        var handler = new StubHttpMessageHandler(_ => JsonResponse("""{"Results":[]}"""));
        var client = CreateClient(handler, new MemoryCache(new MemoryCacheOptions()));

        var result = await client.DecodeAsync("ZZZUNDECADABLE001", CancellationToken.None);

        Assert.That(result, Is.Null);
    }

    [TestCase("""{"Results":[{"Make":"","Model":"Bronco","ModelYear":"2024"}]}""")]
    [TestCase("""{"Results":[{"Make":"Ford","Model":null,"ModelYear":"2024"}]}""")]
    [TestCase("""{"Results":[{"Make":"Ford","Model":"Bronco","ModelYear":"not-a-year"}]}""")]
    public async Task DecodeAsync_ReturnsNull_WhenResultIncomplete(string json)
    {
        var handler = new StubHttpMessageHandler(_ => JsonResponse(json));
        var client = CreateClient(handler, new MemoryCache(new MemoryCacheOptions()));

        var result = await client.DecodeAsync("1FMEE5DP5NLA12345", CancellationToken.None);

        Assert.That(result, Is.Null);
    }

    [Test]
    public async Task DecodeAsync_RequestsExpectedUrl()
    {
        var handler = new StubHttpMessageHandler(_ => JsonResponse("""{"Results":[]}"""));
        var client = CreateClient(handler, new MemoryCache(new MemoryCacheOptions()));

        await client.DecodeAsync("1FMEE5DP5NLA12345", CancellationToken.None);

        Assert.That(handler.RequestedUris, Has.Count.EqualTo(1));
        Assert.That(handler.RequestedUris[0]!.PathAndQuery, Is.EqualTo("/vehicles/DecodeVinValues/1FMEE5DP5NLA12345?format=json"));
    }

    [Test]
    public async Task DecodeAsync_CachesResult_PerVin_CaseInsensitive()
    {
        var handler = new StubHttpMessageHandler(_ => JsonResponse(
            """{"Results":[{"Make":"Ford","Model":"Bronco","ModelYear":"2024"}]}"""));
        var cache = new MemoryCache(new MemoryCacheOptions());
        var client = CreateClient(handler, cache);

        await client.DecodeAsync("1FMEE5DP5NLA12345", CancellationToken.None);
        await client.DecodeAsync("1fmee5dp5nla12345", CancellationToken.None);
        await client.DecodeAsync("2FMEE5DP5NLA12345", CancellationToken.None);

        Assert.That(handler.RequestedUris, Has.Count.EqualTo(2));
    }

    [Test]
    public async Task DecodeAsync_UsesConfiguredCacheDuration_WhenSet()
    {
        var handler = new StubHttpMessageHandler(_ => JsonResponse(
            """{"Results":[{"Make":"Ford","Model":"Bronco","ModelYear":"2024"}]}"""));
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Nhtsa:VinDecodeCacheDurationMinutes"] = "10" })
            .Build();
        var client = CreateClient(handler, new MemoryCache(new MemoryCacheOptions()), configuration);

        var result = await client.DecodeAsync("1FMEE5DP5NLA12345", CancellationToken.None);

        Assert.That(result, Is.Not.Null);
    }
}
