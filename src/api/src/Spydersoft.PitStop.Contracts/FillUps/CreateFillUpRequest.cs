namespace Spydersoft.PitStop.Contracts.FillUps;

public class CreateFillUpRequest : FillUpRequest
{
    public CreateFillUpRequest()
    {
        FilledAt = DateTimeOffset.UtcNow;
    }
}
