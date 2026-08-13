using IdentityModel.Client;
using Microsoft.Extensions.Options;

namespace Spydersoft.PitStop.Api.Services.Notification;

/// <summary>
/// Attaches an OAuth2 client-credentials bearer token to outgoing Notification API requests.
/// Mirrors <c>Spydersoft.FileStore.Client.ClientCredentialsTokenHandler</c> -- Notification.Client
/// doesn't ship its own token handling, so PitStop does it the same way it already does for FileStore.
/// The token is cached in memory and refreshed shortly before it expires. When no token endpoint is
/// configured, requests are passed through unmodified so local/dev usage without auth keeps working.
/// </summary>
public sealed class NotificationClientCredentialsHandler : DelegatingHandler
{
    private static readonly TimeSpan ExpiryBuffer = TimeSpan.FromSeconds(60);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly NotificationAuthOptions _options;
    private readonly TimeProvider _timeProvider;
    private readonly SemaphoreSlim _lock = new(1, 1);

    private string? _accessToken;
    private DateTimeOffset _expiresAt = DateTimeOffset.MinValue;

    public NotificationClientCredentialsHandler(IHttpClientFactory httpClientFactory, IOptions<NotificationAuthOptions> options)
        : this(httpClientFactory, options, TimeProvider.System)
    {
    }

    internal NotificationClientCredentialsHandler(IHttpClientFactory httpClientFactory, IOptions<NotificationAuthOptions> options, TimeProvider timeProvider)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _timeProvider = timeProvider;
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.TokenEndpoint) || string.IsNullOrWhiteSpace(_options.ClientId))
        {
            return await base.SendAsync(request, cancellationToken);
        }

        var accessToken = await GetAccessTokenAsync(cancellationToken);
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        return await base.SendAsync(request, cancellationToken);
    }

    private async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken)
    {
        if (_accessToken != null && _timeProvider.GetUtcNow() < _expiresAt)
        {
            return _accessToken;
        }

        await _lock.WaitAsync(cancellationToken);
        try
        {
            if (_accessToken != null && _timeProvider.GetUtcNow() < _expiresAt)
            {
                return _accessToken;
            }

            var tokenClient = _httpClientFactory.CreateClient("Spydersoft.Notification.TokenClient");
            var response = await tokenClient.RequestClientCredentialsTokenAsync(new ClientCredentialsTokenRequest
            {
                Address = _options.TokenEndpoint,
                ClientId = _options.ClientId!,
                ClientSecret = _options.ClientSecret,
                Scope = _options.Scope,
            }, cancellationToken);

            if (response.IsError)
            {
                throw new InvalidOperationException($"Failed to acquire a Notification access token: {response.Error}", response.Exception);
            }

            _accessToken = response.AccessToken;
            _expiresAt = _timeProvider.GetUtcNow().AddSeconds(response.ExpiresIn) - ExpiryBuffer;
            return _accessToken!;
        }
        finally
        {
            _lock.Release();
        }
    }
}
