using Spydersoft.PitStop.Contracts.Recalls;

namespace Spydersoft.PitStop.Api.Services.Nhtsa;

public interface INhtsaRecallClient
{
    Task<IReadOnlyList<RecallDto>> GetRecallsAsync(string make, string model, int modelYear, CancellationToken ct = default);
}
