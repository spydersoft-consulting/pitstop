namespace Spydersoft.PitStop.Api.UnitTests.Support;

/// <summary>Returns a preset <see cref="HttpClient"/> for one expected named client registration.</summary>
internal sealed class FakeHttpClientFactory(string expectedName, HttpClient client) : IHttpClientFactory
{
    public int CallCount { get; private set; }

    public HttpClient CreateClient(string name)
    {
        if (name != expectedName)
        {
            throw new InvalidOperationException($"Unexpected HttpClient name requested: {name}");
        }

        CallCount++;
        return client;
    }
}
