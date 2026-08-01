namespace Spydersoft.PitStop.Contracts.Maintenance;

public class MaintenanceLogListResponse
{
    public List<MaintenanceLogDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}
