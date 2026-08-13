namespace Spydersoft.PitStop.Api.Services.Notification;

/// <summary>
/// Client-credentials fields for the Notification platform service, bound from the same
/// "Notification" config section as the package's own <c>NotificationOptions</c> (which only
/// knows about BaseUrl/HubUrl -- Spydersoft.Notification.Client does not handle auth itself).
/// </summary>
public class NotificationAuthOptions
{
    public string? ClientId { get; set; }
    public string? ClientSecret { get; set; }
    public string? Scope { get; set; }
    public string? TokenEndpoint { get; set; }
}
