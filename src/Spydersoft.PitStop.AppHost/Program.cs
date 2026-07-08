var builder = DistributedApplication.CreateBuilder(args);

// --- Data API + Postgres ---

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

// --- Web frontend (BFF + Vite UI) ---

var clientId = builder.Configuration["OidcProxy:ClientId"]
    ?? throw new InvalidOperationException("OidcProxy:ClientId is not set in user secrets.");
var clientSecret = builder.Configuration["OidcProxy:ClientSecret"]
    ?? throw new InvalidOperationException("OidcProxy:ClientSecret is not set in user secrets.");

var dataApiUrl = builder.Configuration["Services:DataApiUrl"] ?? "https://localhost:8081/";
var auditApiUrl = builder.Configuration["Services:AuditApiUrl"] ?? "https://localhost:8082/";

var frontendProjectDir = Path.GetFullPath(
    Path.Combine(builder.Environment.ContentRootPath, "..", "web", "src", "Spydersoft.PitStop.Frontend"));

builder.AddViteApp("pitstop-ui", "../web/src/pitstop-ui")
    .WithYarn()
    .WithEndpoint("http", e => { e.Port = 5200; e.IsProxied = false; e.UriScheme = "https"; });

builder.AddProject<Projects.Spydersoft_PitStop_Frontend>("web")
    .WithEndpoint("http", e => { e.Port = 9080; e.TargetPort = 9080; e.IsProxied = false; })
    .WithEndpoint("https", e => { e.Port = 9081; e.TargetPort = 9081; e.IsProxied = false; })
    .WithEnvironment("ASPNETCORE_CONTENTROOT", frontendProjectDir)
    .WithEnvironment("OidcProxySettings__Oidc__ClientId", clientId)
    .WithEnvironment("OidcProxySettings__Oidc__ClientSecret", clientSecret)
    .WithEnvironment("Telemetry__Log__Type", "otlp")
    .WithEnvironment("Telemetry__Metrics__Type", "otlp")
    .WithEnvironment("Telemetry__Trace__Type", "otlp")
    .WithEnvironment(
        "OidcProxySettings__ReverseProxy__Clusters__pitstopApi__Destinations__destination1__Address",
        dataApiUrl)
    .WithEnvironment(
        "OidcProxySettings__ReverseProxy__Clusters__auditApi__Destinations__destination1__Address",
        auditApiUrl)
    .WithHttpHealthCheck("/livez", endpointName: "http");

await builder.Build().RunAsync();
