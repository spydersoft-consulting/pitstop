using Microsoft.EntityFrameworkCore;
using Spydersoft.PitStop.Data;
using Spydersoft.PitStop.DataSeeder;

var connectionString = args.ElementAtOrDefault(0)
    ?? Environment.GetEnvironmentVariable("PITSTOP_CONNECTION_STRING")
    ?? Environment.GetEnvironmentVariable("ConnectionStrings__pitstop-db")
    ?? "Host=localhost;Database=pitstop;Username=postgres;Password=postgres";

var testKey = Environment.GetEnvironmentVariable("PITSTOP_TEST_KEY")
    ?? "jRv3YFPH/19t9t5CgsEFgAkykfW5bQhHmceMprLgzlQ=";

if (args.Contains("--token-only"))
{
    Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(new { token = TokenGenerator.Generate(testKey) }));
    return;
}

var options = new DbContextOptionsBuilder<PitStopDbContext>()
    .UseNpgsql(connectionString)
    .Options;

await using var db = new PitStopDbContext(options);

Console.WriteLine("Applying migrations...");
await db.Database.MigrateAsync();
Console.WriteLine("Migrations applied.");

Console.WriteLine("Seeding test data...");
await SeedData.SeedAsync(db);

Console.WriteLine();
Console.WriteLine("Test token (set as PITSTOP_TEST_TOKEN):");
Console.WriteLine(TokenGenerator.Generate(testKey));
