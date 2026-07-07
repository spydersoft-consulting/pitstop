var builder = DistributedApplication.CreateBuilder(args);

var clientId = builder.Configuration["OidcProxy:ClientId"]
    ?? throw new InvalidOperationException("OidcProxy:ClientId is not set in user secrets.");
var clientSecret = builder.Configuration["OidcProxy:ClientSecret"]
    ?? throw new InvalidOperationException("OidcProxy:ClientSecret is not set in user secrets.");

var dataApiUrl = builder.Configuration["Services:DataApiUrl"] ?? "https://localhost:8081/";
var auditApiUrl = builder.Configuration["Services:AuditApiUrl"] ?? "https://localhost:8082/";

var frontendProjectDir = Path.GetFullPath(
    Path.Combine(builder.Environment.ContentRootPath, "..", "Spydersoft.PitStop.Frontend"));

builder.AddViteApp("pitstop-ui", "../pitstop-ui")
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
