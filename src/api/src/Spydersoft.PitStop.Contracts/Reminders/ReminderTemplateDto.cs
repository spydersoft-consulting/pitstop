namespace Spydersoft.PitStop.Contracts.Reminders;

public class ReminderTemplateDto
{
    public string ServiceType { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal? IntervalMiles { get; set; }
    public int? IntervalMonths { get; set; }
    public decimal? LeadMiles { get; set; }
    public int? LeadDays { get; set; }
}
