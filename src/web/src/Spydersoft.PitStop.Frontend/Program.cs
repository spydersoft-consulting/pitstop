using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.IdentityModel.Logging;
using OidcProxy.Net.ModuleInitializers;
using OidcProxy.Net.OpenIdConnect;
using Spydersoft.Platform.Hosting.Options;
using Spydersoft.Platform.Hosting.StartupExtensions;
using Spydersoft.Platform.Hosting.Telemetry;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

builder.AddSpydersoftTelemetry(typeof(Program).Assembly,
    new ConfigurationFunctions
    {
        // Kubernetes probes hit these every few seconds; they add nothing but noise to traces.
        AspNetFilterFunction = context => !IsHealthCheckPath(context.Request.Path.Value)
    });
builder.AddSpydersoftSerilog(true);
AppHealthCheckOptions healthCheckOptions = builder.AddSpydersoftHealthChecks();

var config = builder.Configuration
    .GetSection("OidcProxySettings")
    .Get<OidcProxyConfig>();

if (config != null)
{
    builder.Services.AddOidcProxy(config);
}
else
{
    throw new InvalidOperationException("OidcProxySettings configuration section is missing or invalid.");
}

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("RequireAuthenticatedUserPolicy", policy =>
    {
        policy.RequireAuthenticatedUser();
    });

builder.Services.AddControllers();

var app = builder.Build();

app.UseRouting();
app.UseSpydersoftRequestLogging();

// Served dynamically rather than as a static wwwroot file so per-environment values (e.g. the
// address lookup provider/key) can come from configuration -- the same env-var-from-Vault path
// already used for OidcProxySettings -- instead of needing a separate build-time config.js per
// environment. Anonymous by default, same as the static file it replaces: the SPA shell (and
// Landing, pre-login) needs this before any auth check happens.
app.MapMethods("/config.js", ["GET", "HEAD"], (IConfiguration configuration) =>
{
    var config = new
    {
        api_url = configuration["Frontend:ApiUrl"] ?? "/api/v1",
        address_lookup_provider = configuration["AddressLookup:Provider"] ?? "none",
        google_places_api_key = configuration["AddressLookup:GooglePlacesApiKey"] ?? "",
    };
    return Results.Text($"globalThis.__config = {JsonSerializer.Serialize(config)};", "application/javascript");
});

app.UseDefaultFiles();
app.UseStaticFiles();

if (app.Environment.IsDevelopment())
{
    IdentityModelEventSource.ShowPII = true;
    IdentityModelEventSource.LogCompleteSecurityArtifact = true;
}

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
});
app.MapControllers();
app.UseSpydersoftHealthChecks(healthCheckOptions);

app.MapFallbackToFile("/index.html");

app.UseOidcProxy();

await app.RunAsync();

static bool IsHealthCheckPath(string? path) =>
    string.Equals(path, "/livez", StringComparison.OrdinalIgnoreCase) ||
    string.Equals(path, "/readyz", StringComparison.OrdinalIgnoreCase);
