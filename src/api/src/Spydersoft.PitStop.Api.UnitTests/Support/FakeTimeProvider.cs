namespace Spydersoft.PitStop.Api.UnitTests.Support;

/// <summary>A controllable clock for testing token-expiry logic without real delays.</summary>
internal sealed class FakeTimeProvider : TimeProvider
{
    public DateTimeOffset UtcNow { get; set; } = DateTimeOffset.UtcNow;

    public override DateTimeOffset GetUtcNow() => UtcNow;
}
