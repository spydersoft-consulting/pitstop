using Spydersoft.Notification.Contracts;

namespace Spydersoft.PitStop.Api.UnitTests.Support;

/// <summary>
/// Records every CreateAsync call for assertions. The other INotificationClient members aren't
/// used by anything PitStop's backend calls yet, so they throw if ever exercised.
/// </summary>
internal sealed class FakeNotificationClient : INotificationClient
{
    public List<CreateNotificationRequest> CreatedRequests { get; } = [];

    /// <summary>When set, every CreateAsync call throws this instead of recording the request.</summary>
    public Exception? FailWith { get; set; }

    public Task<NotificationDto> CreateAsync(CreateNotificationRequest request, CancellationToken ct = default)
    {
        if (FailWith is not null) throw FailWith;
        CreatedRequests.Add(request);
        return Task.FromResult(new NotificationDto(
            Guid.NewGuid(), request.UserId, request.Source, request.Type, request.Subject, request.Body,
            request.Data, request.Priority, NotificationStatus.Created, false, null, DateTimeOffset.UtcNow,
            request.EntityType, request.EntityId, []));
    }

    public Task<IReadOnlyList<NotificationDto>> ListAsync(bool unreadOnly = false, string? source = null, string? type = null, int skip = 0, int limit = 50, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<NotificationDto> GetAsync(Guid id, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<NotificationDto> MarkReadAsync(Guid id, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<int> MarkAllReadAsync(CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<int> GetUnreadCountAsync(CancellationToken ct = default) =>
        throw new NotImplementedException();
}
