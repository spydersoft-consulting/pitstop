using Microsoft.EntityFrameworkCore;
using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.Data.Entities;

namespace Spydersoft.PitStop.DataSeeder;

public static class SeedData
{
    private const string AnalyticsVehicleName = "PitStop Analytics Test Vehicle";

    public static async Task SeedAsync(PitStopDbContext db)
    {
        if (await db.Vehicles.AnyAsync(v => v.Name == AnalyticsVehicleName))
        {
            Console.WriteLine("Test vehicle already exists, skipping seed.");
            return;
        }

        var vehicle = new Vehicle
        {
            OwnerId = TokenGenerator.TestUserId,
            Name = AnalyticsVehicleName,
            Year = 2021,
            Make = "Ford",
            Model = "Bronco",
            Trim = "Badlands",
            InitialOdometer = 0,
            TankCapacityGallons = 20.8m,
            StartDate = new DateOnly(2021, 8, 1)
        };
        db.Vehicles.Add(vehicle);
        await db.SaveChangesAsync();

        var fillUps = BuildFillUps(vehicle.Id);
        db.FillUps.AddRange(fillUps);
        await db.SaveChangesAsync();

        Console.WriteLine($"Seeded vehicle ID={vehicle.Id} with {fillUps.Count} fill-ups.");
    }

    private static List<FillUp> BuildFillUps(int vehicleId)
    {
        // (milesAdded, gallons, pricePerGallon)
        (int Miles, decimal Gallons, decimal Price)[] entries =
        [
            (0,   12.0m, 3.29m),
            (218, 11.8m, 3.35m),
            (204, 12.1m, 3.42m),
            (231, 12.5m, 3.55m),
            (196, 11.2m, 3.61m),
            (222, 12.3m, 3.48m),
            (209, 11.9m, 3.39m),
            (237, 12.8m, 3.29m),
            (201, 11.5m, 3.19m),
            (215, 12.0m, 3.25m),
            (223, 12.4m, 3.38m),
            (198, 11.1m, 3.45m),
        ];

        var fillUps = new List<FillUp>(entries.Length);
        decimal odometer = 0;

        for (int i = 0; i < entries.Length; i++)
        {
            var (miles, gallons, price) = entries[i];
            odometer += miles;

            decimal? milesSince = i > 0 ? (decimal)miles : null;
            decimal? mpg = milesSince.HasValue && milesSince > 0
                ? Math.Round(milesSince.Value / gallons, 2)
                : null;

            fillUps.Add(new FillUp
            {
                VehicleId = vehicleId,
                FilledAt = DateTimeOffset.UtcNow.AddMonths(-(entries.Length - i)),
                OdometerReading = odometer,
                GallonsAdded = gallons,
                FuelGrade = FuelGrade.MidGrade,
                PricePerGallon = price,
                TotalCost = Math.Round(gallons * price, 2),
                IsFullFillUp = true,
                MilesSinceLastFillUp = milesSince,
                MpgThisFillUp = mpg
            });
        }

        return fillUps;
    }
}
