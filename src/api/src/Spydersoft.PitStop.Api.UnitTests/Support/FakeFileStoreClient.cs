using Spydersoft.FileStore.Contracts;

namespace Spydersoft.PitStop.Api.UnitTests.Support;

/// <summary>
/// Throws on every call. Existing MaintenanceLogsController tests don't exercise the
/// attachment endpoints, so this only needs to satisfy the constructor.
/// </summary>
internal sealed class FakeFileStoreClient : IFileStoreClient
{
    public Task<InitiateUploadResponse> InitiateUploadAsync(InitiateUploadRequest request, CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

    public Task ConfirmUploadAsync(Guid fileId, CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

    public Task<IReadOnlyList<FileDto>> ListFilesAsync(string? source = null, string? entityType = null, string? entityId = null, CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

    public Task<FileDto?> GetFileAsync(Guid fileId, CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

    public Task<FileUrlResponse> GetFileUrlAsync(Guid fileId, CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

    public Task DeleteFileAsync(Guid fileId, CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();
}
