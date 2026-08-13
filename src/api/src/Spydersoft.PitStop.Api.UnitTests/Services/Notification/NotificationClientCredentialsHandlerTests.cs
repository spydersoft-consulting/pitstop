using System.Net;
using System.Text;
using Microsoft.Extensions.Options;
using NUnit.Framework;
using Spydersoft.PitStop.Api.Services.Notification;
using Spydersoft.PitStop.Api.UnitTests.Support;

namespace Spydersoft.PitStop.Api.UnitTests.Services.Notification;

[TestFixture]
public class NotificationClientCredentialsHandlerTests
{
    private const string TokenClientName = "Spydersoft.Notification.TokenClient";

    private static HttpRequestMessage CreateRequest() => new(HttpMethod.Get, "https://notify.example.com/api/v1/notifications");

    private static HttpResponseMessage TokenResponse(string accessToken = "test-token", int expiresIn = 3600) =>
        new(HttpStatusCode.OK)
        {
            Content = new StringContent(
                $$"""{"access_token":"{{accessToken}}","expires_in":{{expiresIn}},"token_type":"Bearer"}""",
                Encoding.UTF8,
                "application/json"),
        };

    private static NotificationClientCredentialsHandler CreateHandler(
        NotificationAuthOptions options,
        StubHttpMessageHandler tokenHandler,
        StubHttpMessageHandler innerHandler,
        FakeHttpClientFactory? factory = null,
        TimeProvider? timeProvider = null)
    {
        factory ??= new FakeHttpClientFactory(TokenClientName, new HttpClient(tokenHandler));
        var handler = new NotificationClientCredentialsHandler(factory, Options.Create(options), timeProvider ?? TimeProvider.System)
        {
            InnerHandler = innerHandler,
        };
        return handler;
    }

    [Test]
    public async Task SendAsync_WithNoTokenEndpointConfigured_PassesThroughWithoutAttachingToken()
    {
        var options = new NotificationAuthOptions();
        var tokenHandler = new StubHttpMessageHandler(_ => TokenResponse());
        HttpRequestMessage? capturedRequest = null;
        var innerHandler = new StubHttpMessageHandler(r =>
        {
            capturedRequest = r;
            return new HttpResponseMessage(HttpStatusCode.OK);
        });
        var handler = CreateHandler(options, tokenHandler, innerHandler);

        using var invoker = new HttpMessageInvoker(handler);
        var response = await invoker.SendAsync(CreateRequest(), CancellationToken.None);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(capturedRequest!.Headers.Authorization, Is.Null);
        Assert.That(tokenHandler.RequestedUris, Is.Empty);
    }

    [Test]
    public async Task SendAsync_WithTokenEndpointConfigured_AttachesBearerToken()
    {
        var options = new NotificationAuthOptions
        {
            TokenEndpoint = "https://auth.example.com/connect/token",
            ClientId = "pitstop-api",
            ClientSecret = "secret",
            Scope = "notification:write",
        };
        var tokenHandler = new StubHttpMessageHandler(_ => TokenResponse("access-123"));
        HttpRequestMessage? capturedRequest = null;
        var innerHandler = new StubHttpMessageHandler(r =>
        {
            capturedRequest = r;
            return new HttpResponseMessage(HttpStatusCode.OK);
        });
        var handler = CreateHandler(options, tokenHandler, innerHandler);

        using var invoker = new HttpMessageInvoker(handler);
        await invoker.SendAsync(CreateRequest(), CancellationToken.None);

        Assert.That(capturedRequest!.Headers.Authorization!.Scheme, Is.EqualTo("Bearer"));
        Assert.That(capturedRequest.Headers.Authorization!.Parameter, Is.EqualTo("access-123"));
        Assert.That(tokenHandler.RequestedUris, Has.Count.EqualTo(1));
    }

    [Test]
    public async Task SendAsync_CalledTwiceBeforeExpiry_ReusesCachedToken()
    {
        var options = new NotificationAuthOptions
        {
            TokenEndpoint = "https://auth.example.com/connect/token",
            ClientId = "pitstop-api",
            ClientSecret = "secret",
        };
        var tokenHandler = new StubHttpMessageHandler(_ => TokenResponse(expiresIn: 3600));
        var innerHandler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK));
        var handler = CreateHandler(options, tokenHandler, innerHandler);

        using var invoker = new HttpMessageInvoker(handler);
        await invoker.SendAsync(CreateRequest(), CancellationToken.None);
        await invoker.SendAsync(CreateRequest(), CancellationToken.None);

        Assert.That(tokenHandler.RequestedUris, Has.Count.EqualTo(1));
    }

    [Test]
    public async Task SendAsync_AfterTokenExpires_FetchesANewToken()
    {
        var options = new NotificationAuthOptions
        {
            TokenEndpoint = "https://auth.example.com/connect/token",
            ClientId = "pitstop-api",
            ClientSecret = "secret",
        };
        var tokenHandler = new StubHttpMessageHandler(_ => TokenResponse(expiresIn: 120));
        var innerHandler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK));
        var timeProvider = new FakeTimeProvider { UtcNow = DateTimeOffset.UtcNow };
        var handler = CreateHandler(options, tokenHandler, innerHandler, timeProvider: timeProvider);

        using var invoker = new HttpMessageInvoker(handler);
        await invoker.SendAsync(CreateRequest(), CancellationToken.None);

        timeProvider.UtcNow += TimeSpan.FromSeconds(61);
        await invoker.SendAsync(CreateRequest(), CancellationToken.None);

        Assert.That(tokenHandler.RequestedUris, Has.Count.EqualTo(2));
    }

    [Test]
    public void SendAsync_WhenTokenRequestFails_ThrowsInvalidOperationException()
    {
        var options = new NotificationAuthOptions
        {
            TokenEndpoint = "https://auth.example.com/connect/token",
            ClientId = "pitstop-api",
            ClientSecret = "wrong-secret",
        };
        var tokenHandler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.BadRequest)
        {
            Content = new StringContent("""{"error":"invalid_client"}""", Encoding.UTF8, "application/json"),
        });
        var innerHandler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK));
        var handler = CreateHandler(options, tokenHandler, innerHandler);

        using var invoker = new HttpMessageInvoker(handler);
        Assert.ThrowsAsync<InvalidOperationException>(() => invoker.SendAsync(CreateRequest(), CancellationToken.None));
    }
}
