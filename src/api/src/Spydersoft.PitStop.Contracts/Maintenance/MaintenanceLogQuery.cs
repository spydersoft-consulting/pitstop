namespace Spydersoft.PitStop.Contracts.Maintenance;

public class MaintenanceLogQuery
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? ServiceType { get; set; }
    public string? PerformedBy { get; set; }
    public string SortBy { get; set; } = "date";
    public string Order { get; set; } = "desc";
}
