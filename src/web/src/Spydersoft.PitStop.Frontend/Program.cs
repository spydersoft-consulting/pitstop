using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.IdentityModel.Logging;
using OidcProxy.Net.ModuleInitializers;
using OidcProxy.Net.OpenIdConnect;
using Spydersoft.Platform.Hosting.Options;
using Spydersoft.Platform.Hosting.StartupExtensions;
using Spydersoft.Platform.Hosting.Telemetry;

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
