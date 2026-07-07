var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres", port: 8100);

if (builder.Environment.EnvironmentName != "Testing")
{
    postgres.WithDataVolume();
}

var db = postgres.AddDatabase("pitstop-db");


var api = builder.AddProject<Projects.Spydersoft_PitStop_Api>("api")
    .WithEndpoint("http", e => { e.Port = 8080; e.TargetPort = 8080; e.IsProxied = false; })
    .WithEndpoint("https", e => { e.Port = 8081; e.TargetPort = 8081; e.IsProxied = false; })
    .WithEnvironment("Telemetry__Log__Type", "otlp")
    .WithEnvironment("Telemetry__Metrics__Type", "otlp")
    .WithEnvironment("Telemetry__Trace__Type", "otlp")
    .WithReference(db)
    .WaitFor(db);

if (builder.Environment.EnvironmentName == "Testing")
{
    var testKey = builder.Configuration["Auth:TestKey"]
        ?? "jRv3YFPH/19t9t5CgsEFgAkykfW5bQhHmceMprLgzlQ=";

    api.WithEnvironment("DOTNET_ENVIRONMENT", "Testing")
       .WithEnvironment("Auth__TestKey", testKey);

    builder.AddProject<Projects.Spydersoft_PitStop_DataSeeder>("data-seeder")
        .WithReference(db)
        .WaitFor(api)
        .WithEnvironment("PITSTOP_TEST_KEY", testKey);
}

await builder.Build().RunAsync();
