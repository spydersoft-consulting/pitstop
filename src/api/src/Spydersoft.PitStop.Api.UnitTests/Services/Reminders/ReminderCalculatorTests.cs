using NUnit.Framework;
using Spydersoft.PitStop.Api.Services.Reminders;
using Spydersoft.PitStop.Data.Entities;

namespace Spydersoft.PitStop.Api.UnitTests.Services.Reminders;

[TestFixture]
public class ReminderCalculatorTests
{
    private static readonly DateOnly Today = new(2026, 6, 1);

    private static MaintenanceReminder Reminder(
        decimal? miles = null, int? months = null, decimal? leadMiles = null, int? leadDays = null) => new()
        {
            IntervalMiles = miles,
            IntervalMonths = months,
            LeadMiles = leadMiles,
            LeadDays = leadDays,
        };

    private static OdometerEstimate Estimate(decimal odometer, decimal daily = 0) => new(odometer, daily, false);

    [Test]
    public void ChooseBaseline_UsesVehicleStart_WhenNothingElseExists()
    {
        var baseline = ReminderCalculator.ChooseBaseline([], null, null, new DateOnly(2025, 1, 1), 1000);

        Assert.That(baseline, Is.EqualTo(new ReminderBaseline(new DateOnly(2025, 1, 1), 1000)));
    }

    [Test]
    public void ChooseBaseline_PicksMostRecentAcrossLogsAndLastDone()
    {
        OdometerSample[] logs = [new(new DateOnly(2026, 1, 1), 20000), new(new DateOnly(2026, 3, 1), 24000)];

        var withNewerLastDone = ReminderCalculator.ChooseBaseline(logs, new DateOnly(2026, 4, 1), 26000, new DateOnly(2025, 1, 1), 0);
        var withOlderLastDone = ReminderCalculator.ChooseBaseline(logs, new DateOnly(2026, 2, 1), 22000, new DateOnly(2025, 1, 1), 0);

        Assert.That(withNewerLastDone.Odometer, Is.EqualTo(26000));
        Assert.That(withOlderLastDone.Odometer, Is.EqualTo(24000));
    }

    [Test]
    public void EstimateOdometer_ExtrapolatesFromRecentDailyMileage()
    {
        OdometerSample[] samples = [new(new DateOnly(2026, 4, 1), 10000), new(new DateOnly(2026, 5, 1), 10300)];

        var estimate = ReminderCalculator.EstimateOdometer(samples, Today);

        Assert.That(estimate.AverageDailyMiles, Is.EqualTo(10m));
        Assert.That(estimate.Odometer, Is.EqualTo(10610m));
        Assert.That(estimate.IsEstimated, Is.True);
    }

    [Test]
    public void EstimateOdometer_CapsExtrapolation()
    {
        OdometerSample[] samples = [new(new DateOnly(2025, 1, 1), 0), new(new DateOnly(2025, 1, 31), 300)];

        var estimate = ReminderCalculator.EstimateOdometer(samples, new DateOnly(2026, 6, 1));

        Assert.That(estimate.Odometer, Is.EqualTo(300 + 10 * 90));
    }

    [Test]
    public void EstimateOdometer_DoesNotExtrapolate_WhenSpanTooShortToTrust()
    {
        OdometerSample[] samples = [new(new DateOnly(2026, 5, 25), 10000), new(new DateOnly(2026, 5, 30), 10500)];

        var estimate = ReminderCalculator.EstimateOdometer(samples, Today);

        Assert.That(estimate.Odometer, Is.EqualTo(10500));
        Assert.That(estimate.IsEstimated, Is.False);
    }

    [Test]
    public void EstimateOdometer_ReturnsZero_WithNoSamples()
    {
        var estimate = ReminderCalculator.EstimateOdometer([], Today);

        Assert.That(estimate.Odometer, Is.Zero);
    }

    [TestCase(10000, ReminderStatus.Ok)]
    [TestCase(14600, ReminderStatus.DueSoon)]
    [TestCase(15000, ReminderStatus.Overdue)]
    [TestCase(15400, ReminderStatus.Overdue)]
    public void Evaluate_MileageOnly_StatusFollowsEstimatedOdometer(int odometer, ReminderStatus expected)
    {
        var baseline = new ReminderBaseline(new DateOnly(2026, 5, 1), 10000);

        var result = ReminderCalculator.Evaluate(Reminder(miles: 5000, leadMiles: 500), baseline, Estimate(odometer), Today);

        Assert.That(result.Status, Is.EqualTo(expected));
        Assert.That(result.NextDueOdometer, Is.EqualTo(15000));
        Assert.That(result.NextDueDate, Is.Null);
    }

    [TestCase("2026-06-01", ReminderStatus.Ok)]
    [TestCase("2026-10-20", ReminderStatus.DueSoon)]
    [TestCase("2026-11-01", ReminderStatus.Overdue)]
    public void Evaluate_TimeOnly_StatusFollowsDate(string today, ReminderStatus expected)
    {
        var baseline = new ReminderBaseline(new DateOnly(2026, 5, 1), 10000);

        var result = ReminderCalculator.Evaluate(Reminder(months: 6, leadDays: 14), baseline, Estimate(10000), DateOnly.Parse(today));

        Assert.That(result.Status, Is.EqualTo(expected));
        Assert.That(result.NextDueDate, Is.EqualTo(new DateOnly(2026, 11, 1)));
        Assert.That(result.NextDueOdometer, Is.Null);
    }

    [Test]
    public void Evaluate_WhicheverFirst_TimeCanMakeItOverdueBeforeMileage()
    {
        var baseline = new ReminderBaseline(new DateOnly(2025, 11, 1), 10000);

        var result = ReminderCalculator.Evaluate(Reminder(miles: 5000, months: 6), baseline, Estimate(10100), Today);

        Assert.That(result.Status, Is.EqualTo(ReminderStatus.Overdue));
    }

    [Test]
    public void Evaluate_WhicheverFirst_MileageCanMakeItOverdueBeforeTime()
    {
        var baseline = new ReminderBaseline(new DateOnly(2026, 5, 1), 10000);

        var result = ReminderCalculator.Evaluate(Reminder(miles: 5000, months: 6), baseline, Estimate(15100), Today);

        Assert.That(result.Status, Is.EqualTo(ReminderStatus.Overdue));
    }

    [Test]
    public void Evaluate_Snoozed_OverridesOverdueUntilSnoozeEnds()
    {
        var baseline = new ReminderBaseline(new DateOnly(2026, 5, 1), 10000);
        var reminder = Reminder(miles: 5000);
        reminder.SnoozedUntil = Today;

        var snoozed = ReminderCalculator.Evaluate(reminder, baseline, Estimate(16000), Today);
        var expired = ReminderCalculator.Evaluate(reminder, baseline, Estimate(16000), Today.AddDays(1));

        Assert.That(snoozed.Status, Is.EqualTo(ReminderStatus.Snoozed));
        Assert.That(expired.Status, Is.EqualTo(ReminderStatus.Overdue));
    }

    [Test]
    public void Evaluate_NoLeadTime_SkipsDueSoon()
    {
        var baseline = new ReminderBaseline(new DateOnly(2026, 5, 1), 10000);

        var result = ReminderCalculator.Evaluate(Reminder(miles: 5000), baseline, Estimate(14900), Today);

        Assert.That(result.Status, Is.EqualTo(ReminderStatus.Ok));
    }

    [Test]
    public void Evaluate_ProjectsDueDate_FromDailyMileage()
    {
        var baseline = new ReminderBaseline(new DateOnly(2026, 5, 1), 10000);

        var result = ReminderCalculator.Evaluate(Reminder(miles: 5000), baseline, Estimate(14000, daily: 20), Today);

        Assert.That(result.ProjectedDueDate, Is.EqualTo(Today.AddDays(50)));
    }

    [TestCase(0.0001)]
    [TestCase(0.000000001)]
    public void Evaluate_DoesNotProject_WhenDrivingPaceIsTooSlowToReachTheDueOdometer(double dailyMiles)
    {
        var baseline = new ReminderBaseline(new DateOnly(2026, 5, 1), 10000);

        var result = ReminderCalculator.Evaluate(Reminder(miles: 5000), baseline, Estimate(14000, daily: (decimal)dailyMiles), Today);

        Assert.That(result.ProjectedDueDate, Is.Null);
        Assert.That(result.Status, Is.EqualTo(ReminderStatus.Ok));
    }

    [Test]
    public void Evaluate_ProjectsAsFarAsTenYearsOut_ButNoFurther()
    {
        var baseline = new ReminderBaseline(new DateOnly(2026, 5, 1), 10000);

        var tenYears = ReminderCalculator.Evaluate(Reminder(miles: 5000), baseline, Estimate(11350, daily: 1m), Today);
        var beyond = ReminderCalculator.Evaluate(Reminder(miles: 5000), baseline, Estimate(11349, daily: 1m), Today);

        Assert.That(tenYears.ProjectedDueDate, Is.EqualTo(Today.AddDays(3650)));
        Assert.That(beyond.ProjectedDueDate, Is.Null);
    }

    [Test]
    public void Evaluate_NoProjection_WithoutDailyMileage()
    {
        var baseline = new ReminderBaseline(new DateOnly(2026, 5, 1), 10000);

        var result = ReminderCalculator.Evaluate(Reminder(miles: 5000), baseline, Estimate(14000), Today);

        Assert.That(result.ProjectedDueDate, Is.Null);
    }

    [Test]
    public void CycleKey_ChangesWhenBaselineChanges()
    {
        var first = new ReminderBaseline(new DateOnly(2026, 5, 1), 10000);
        var second = new ReminderBaseline(new DateOnly(2026, 6, 1), 15000);

        Assert.That(first.CycleKey, Is.Not.EqualTo(second.CycleKey));
    }
}
