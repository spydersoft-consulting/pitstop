using Spydersoft.PitStop.Data.Entities;

namespace Spydersoft.PitStop.Api.Services.Reminders;

public enum ReminderStatus
{
    Ok,
    DueSoon,
    Overdue,
    Snoozed,
}

public record OdometerSample(DateOnly Date, decimal Odometer);

public record ReminderBaseline(DateOnly Date, decimal Odometer)
{
    /// <summary>Changes whenever the service is performed, which starts a new notification cycle.</summary>
    public string CycleKey => $"{Date:yyyyMMdd}:{Odometer:0.#}";
}

public record ReminderCompletion(int LogId, DateOnly Date, decimal Odometer);

public record ReminderHistoryEntry(
    int LogId,
    DateOnly Date,
    decimal Odometer,
    DateOnly? DueDate,
    decimal? DueOdometer,
    int? DaysLate,
    decimal? MilesOver)
{
    public bool WasLate => DaysLate > 0 || MilesOver > 0;
}

public record OdometerEstimate(decimal Odometer, decimal AverageDailyMiles, bool IsEstimated);

public record ReminderEvaluation(
    ReminderStatus Status,
    ReminderBaseline Baseline,
    decimal? NextDueOdometer,
    DateOnly? NextDueDate,
    OdometerEstimate Estimate,
    DateOnly? ProjectedDueDate);

/// <summary>Pure due-date and status math for <see cref="MaintenanceReminder"/>.</summary>
public static class ReminderCalculator
{
    private const int RecentWindowDays = 180;
    private const int MinimumSpanDays = 14;
    private const int MaxExtrapolationDays = 90;
    private const int MaxProjectionDays = 3650;

    /// <summary>
    /// The most recent of: matching maintenance logs, the reminder's own last-done values, and the
    /// vehicle's starting point.
    /// </summary>
    public static ReminderBaseline ChooseBaseline(
        IEnumerable<OdometerSample> matchingLogs,
        DateOnly? lastDoneDate,
        decimal? lastDoneOdometer,
        DateOnly vehicleStartDate,
        decimal vehicleInitialOdometer)
    {
        var candidates = matchingLogs.Select(l => new ReminderBaseline(l.Date, l.Odometer)).ToList();
        if (lastDoneDate.HasValue && lastDoneOdometer.HasValue)
        {
            candidates.Add(new ReminderBaseline(lastDoneDate.Value, lastDoneOdometer.Value));
        }

        return candidates.Count == 0
            ? new ReminderBaseline(vehicleStartDate, vehicleInitialOdometer)
            : candidates.OrderByDescending(c => c.Date).ThenByDescending(c => c.Odometer).First();
    }

    /// <summary>
    /// Projects the current odometer from the latest reading and recent daily mileage.
    /// Extrapolation is capped so a long-unused vehicle isn't assumed to keep driving.
    /// </summary>
    public static OdometerEstimate EstimateOdometer(IReadOnlyCollection<OdometerSample> samples, DateOnly today)
    {
        if (samples.Count == 0)
        {
            return new OdometerEstimate(0, 0, false);
        }

        var ordered = samples.OrderBy(s => s.Date).ThenBy(s => s.Odometer).ToList();
        var latest = ordered[^1];

        var recent = ordered.Where(s => s.Date >= today.AddDays(-RecentWindowDays)).ToList();
        var average = AverageDailyMiles(recent) ?? AverageDailyMiles(ordered) ?? 0;

        var extrapolateDays = Math.Clamp(today.DayNumber - latest.Date.DayNumber, 0, MaxExtrapolationDays);
        var estimated = average > 0 && extrapolateDays > 0;

        return new OdometerEstimate(
            latest.Odometer + (estimated ? average * extrapolateDays : 0),
            average,
            estimated);
    }

    public static ReminderEvaluation Evaluate(
        MaintenanceReminder reminder,
        ReminderBaseline baseline,
        OdometerEstimate estimate,
        DateOnly today)
    {
        decimal? dueOdometer = reminder.IntervalMiles is > 0 ? baseline.Odometer + reminder.IntervalMiles : null;
        DateOnly? dueDate = reminder.IntervalMonths is > 0 ? baseline.Date.AddMonths(reminder.IntervalMonths.Value) : null;

        var overdue = (dueOdometer.HasValue && estimate.Odometer >= dueOdometer)
            || (dueDate.HasValue && today >= dueDate);

        var dueSoon = (dueOdometer.HasValue && reminder.LeadMiles is > 0 && estimate.Odometer >= dueOdometer - reminder.LeadMiles)
            || (dueDate.HasValue && reminder.LeadDays is > 0 && today >= dueDate.Value.AddDays(-reminder.LeadDays.Value));

        var status = reminder.SnoozedUntil.HasValue && reminder.SnoozedUntil.Value >= today
            ? ReminderStatus.Snoozed
            : overdue ? ReminderStatus.Overdue
            : dueSoon ? ReminderStatus.DueSoon
            : ReminderStatus.Ok;

        DateOnly? projected = null;
        if (dueOdometer.HasValue && estimate.AverageDailyMiles > 0)
        {
            var remaining = Math.Max(0, dueOdometer.Value - estimate.Odometer);
            if (remaining <= estimate.AverageDailyMiles * MaxProjectionDays)
            {
                projected = today.AddDays((int)Math.Ceiling(remaining / estimate.AverageDailyMiles));
            }
        }

        return new ReminderEvaluation(status, baseline, dueOdometer, dueDate, estimate, projected);
    }

    /// <summary>
    /// Measures each completion against the reminder's current interval from the one before it.
    /// The first completion has nothing to measure from, so it carries no due values.
    /// </summary>
    public static IReadOnlyList<ReminderHistoryEntry> BuildHistory(
        MaintenanceReminder reminder,
        IEnumerable<ReminderCompletion> completions)
    {
        var entries = new List<ReminderHistoryEntry>();
        ReminderCompletion? previous = null;

        foreach (var completion in completions.OrderBy(c => c.Date).ThenBy(c => c.Odometer))
        {
            DateOnly? dueDate = null;
            decimal? dueOdometer = null;
            int? daysLate = null;
            decimal? milesOver = null;

            if (previous is not null)
            {
                if (reminder.IntervalMonths is > 0)
                {
                    dueDate = previous.Date.AddMonths(reminder.IntervalMonths.Value);
                    daysLate = Math.Max(0, completion.Date.DayNumber - dueDate.Value.DayNumber);
                }

                if (reminder.IntervalMiles is > 0)
                {
                    dueOdometer = previous.Odometer + reminder.IntervalMiles;
                    milesOver = Math.Max(0, completion.Odometer - dueOdometer.Value);
                }
            }

            entries.Add(new ReminderHistoryEntry(
                completion.LogId, completion.Date, completion.Odometer, dueDate, dueOdometer, daysLate, milesOver));
            previous = completion;
        }

        return entries;
    }

    private static decimal? AverageDailyMiles(IReadOnlyList<OdometerSample> ordered)
    {
        if (ordered.Count < 2)
        {
            return null;
        }

        var first = ordered[0];
        var last = ordered[^1];
        var days = last.Date.DayNumber - first.Date.DayNumber;
        return days < MinimumSpanDays ? null : Math.Max(0, (last.Odometer - first.Odometer) / days);
    }
}
