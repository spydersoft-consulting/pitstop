using Spydersoft.FileStore.Contracts;

namespace Spydersoft.PitStop.Api.UnitTests.Support;

/// <summary>
/// Returns canned responses for the operations MaintenanceLogsController's attachment
/// endpoints actually use, and records the last request of each kind for assertions.
/// ListFilesAsync/GetFileAsync are unused by the controller and throw if ever called.
/// </summary>
internal sealed class FakeFileStoreClient : IFileStoreClient
{
    public InitiateUploadRequest? LastInitiateRequest { get; private set; }
    public Guid? LastConfirmedFileId { get; private set; }
    public Guid? LastUrlFileId { get; private set; }
    public Guid? LastDeletedFileId { get; private set; }

    public Guid NextFileId { get; set; } = Guid.NewGuid();
    public string NextUploadUrl { get; set; } = "https://filestore.test/upload";
    public string NextDownloadUrl { get; set; } = "https://filestore.test/download";

    public Task<InitiateUploadResponse> InitiateUploadAsync(InitiateUploadRequest request, CancellationToken cancellationToken = default)
    {
        LastInitiateRequest = request;
        return Task.FromResult(new InitiateUploadResponse(NextFileId, NextUploadUrl, DateTimeOffset.UtcNow.AddMinutes(15)));
    }

    public Task ConfirmUploadAsync(Guid fileId, CancellationToken cancellationToken = default)
    {
        LastConfirmedFileId = fileId;
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<FileDto>> ListFilesAsync(string? source = null, string? entityType = null, string? entityId = null, CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

    public Task<FileDto?> GetFileAsync(Guid fileId, CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

    public Task<FileUrlResponse> GetFileUrlAsync(Guid fileId, CancellationToken cancellationToken = default)
    {
        LastUrlFileId = fileId;
        return Task.FromResult(new FileUrlResponse(NextDownloadUrl, DateTimeOffset.UtcNow.AddHours(1)));
    }

    public Task DeleteFileAsync(Guid fileId, CancellationToken cancellationToken = default)
    {
        LastDeletedFileId = fileId;
        return Task.CompletedTask;
    }
}
