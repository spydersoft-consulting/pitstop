using Spydersoft.PitStop.Api.Services.Nhtsa;
using Spydersoft.PitStop.Contracts.Recalls;

namespace Spydersoft.PitStop.Api.UnitTests.Support;

/// <summary>
/// Returns canned recall results and records the last make/model/year queried, for assertions.
/// </summary>
internal sealed class FakeNhtsaRecallClient : INhtsaRecallClient
{
    public (string Make, string Model, int ModelYear)? LastQuery { get; private set; }

    public List<RecallDto> NextResult { get; set; } = [];

    /// <summary>When set, every call throws this instead of returning a canned response.</summary>
    public Exception? FailWith { get; set; }

    public Task<IReadOnlyList<RecallDto>> GetRecallsAsync(string make, string model, int modelYear, CancellationToken ct = default)
    {
        if (FailWith is not null) throw FailWith;
        LastQuery = (make, model, modelYear);
        return Task.FromResult<IReadOnlyList<RecallDto>>(NextResult);
    }
}
