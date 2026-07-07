namespace Spydersoft.PitStop.Contracts.FillUps;

public class FillUpListQuery
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public DateOnly? From { get; set; }
    public DateOnly? To { get; set; }
    public string OrderBy { get; set; } = "filledAt";
    public string Order { get; set; } = "desc";
}
