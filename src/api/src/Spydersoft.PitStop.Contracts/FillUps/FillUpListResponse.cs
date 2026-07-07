namespace Spydersoft.PitStop.Contracts.FillUps;

public class FillUpListResponse
{
    public List<FillUpDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}
