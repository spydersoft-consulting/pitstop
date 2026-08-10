using System.Net;
using System.Text;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using NUnit.Framework;
using Spydersoft.PitStop.Api.Services.Nhtsa;
using Spydersoft.PitStop.Api.UnitTests.Support;

namespace Spydersoft.PitStop.Api.UnitTests.Services.Nhtsa;

[TestFixture]
public class NhtsaRecallClientTests
{
    private const string RecallsJson = """
        {
          "Count": 1,
          "results": [
            {
              "NHTSACampaignNumber": "24V123000",
              "Manufacturer": "Ford Motor Company",
              "Component": "STEERING",
              "Summary": "Test summary.",
              "Consequence": "Test consequence.",
              "Remedy": "Test remedy.",
              "Notes": "Some notes.",
              "parkIt": true,
              "parkOutSide": false
            }
          ]
        }
        """;

    private static HttpResponseMessage JsonResponse(string json) =>
        new(HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") };

    private static NhtsaRecallClient CreateClient(StubHttpMessageHandler handler, IMemoryCache cache, IConfiguration? configuration = null)
    {
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("http://nhtsa.test/") };
        return new NhtsaRecallClient(httpClient, cache, configuration ?? new ConfigurationBuilder().Build());
    }

    [Test]
    public async Task GetRecallsAsync_MapsResponseFieldsToDto()
    {
        var handler = new StubHttpMessageHandler(_ => JsonResponse(RecallsJson));
        var client = CreateClient(handler, new MemoryCache(new MemoryCacheOptions()));

        var recalls = await client.GetRecallsAsync("Ford", "Bronco", 2024, CancellationToken.None);

        Assert.That(recalls, Has.Count.EqualTo(1));
        var recall = recalls[0];
        Assert.That(recall.CampaignNumber, Is.EqualTo("24V123000"));
        Assert.That(recall.Manufacturer, Is.EqualTo("Ford Motor Company"));
        Assert.That(recall.Component, Is.EqualTo("STEERING"));
        Assert.That(recall.Summary, Is.EqualTo("Test summary."));
        Assert.That(recall.Consequence, Is.EqualTo("Test consequence."));
        Assert.That(recall.Remedy, Is.EqualTo("Test remedy."));
        Assert.That(recall.Notes, Is.EqualTo("Some notes."));
        Assert.That(recall.ParkIt, Is.True);
        Assert.That(recall.ParkOutside, Is.False);
    }

    [Test]
    public async Task GetRecallsAsync_RequestsExpectedUrl()
    {
        var handler = new StubHttpMessageHandler(_ => JsonResponse("""{"Count":0,"results":[]}"""));
        var client = CreateClient(handler, new MemoryCache(new MemoryCacheOptions()));

        await client.GetRecallsAsync("Ford", "F-150", 2023, CancellationToken.None);

        Assert.That(handler.RequestedUris, Has.Count.EqualTo(1));
        Assert.That(handler.RequestedUris[0]!.PathAndQuery, Is.EqualTo("/recalls/recallsByVehicle?make=Ford&model=F-150&modelYear=2023"));
    }

    [Test]
    public async Task GetRecallsAsync_ReturnsEmptyList_WhenNoRecalls()
    {
        var handler = new StubHttpMessageHandler(_ => JsonResponse("""{"Count":0,"results":[]}"""));
        var client = CreateClient(handler, new MemoryCache(new MemoryCacheOptions()));

        var recalls = await client.GetRecallsAsync("Honda", "Civic", 2021, CancellationToken.None);

        Assert.That(recalls, Is.Empty);
    }

    [Test]
    public async Task GetRecallsAsync_CachesResult_PerMakeModelYear_CaseInsensitive()
    {
        var handler = new StubHttpMessageHandler(_ => JsonResponse(RecallsJson));
        var cache = new MemoryCache(new MemoryCacheOptions());
        var client = CreateClient(handler, cache);

        await client.GetRecallsAsync("Ford", "Bronco", 2024, CancellationToken.None);
        await client.GetRecallsAsync("ford", "bronco", 2024, CancellationToken.None);
        await client.GetRecallsAsync("Ford", "Bronco", 2023, CancellationToken.None);

        Assert.That(handler.RequestedUris, Has.Count.EqualTo(2));
    }

    [Test]
    public async Task GetRecallsAsync_UsesConfiguredCacheDuration_WhenSet()
    {
        var handler = new StubHttpMessageHandler(_ => JsonResponse(RecallsJson));
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Nhtsa:CacheDurationMinutes"] = "60" })
            .Build();
        var client = CreateClient(handler, new MemoryCache(new MemoryCacheOptions()), configuration);

        var recalls = await client.GetRecallsAsync("Ford", "Bronco", 2024, CancellationToken.None);

        Assert.That(recalls, Has.Count.EqualTo(1));
    }
}
