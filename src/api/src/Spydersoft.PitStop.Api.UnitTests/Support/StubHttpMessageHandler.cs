namespace Spydersoft.PitStop.Api.UnitTests.Support;

/// <summary>Returns a canned response for every request and records the requested URIs, for assertions.</summary>
internal sealed class StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> handler) : HttpMessageHandler
{
    public List<Uri?> RequestedUris { get; } = [];

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        RequestedUris.Add(request.RequestUri);
        return Task.FromResult(handler(request));
    }
}
