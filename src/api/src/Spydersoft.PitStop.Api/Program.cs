using Spydersoft.PitStop.Api;
using Spydersoft.PitStop.Api.Jobs;
using Spydersoft.PitStop.Api.Services;
using Spydersoft.PitStop.Api.Services.Nhtsa;
using Spydersoft.PitStop.Api.Services.Notification;
using Spydersoft.PitStop.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Spydersoft.FileStore.Client;
using Spydersoft.Notification.Client;
using Spydersoft.Notification.Contracts;
using Spydersoft.Platform.Hosting.StartupExtensions;
using Spydersoft.Platform.Hosting.Telemetry;
using System.IdentityModel.Tokens.Jwt;

var builder = WebApplication.CreateBuilder(args);

builder.AddSpydersoftTelemetry(typeof(Program).Assembly,
    new ConfigurationFunctions
    {
        // Kubernetes probes hit these every few seconds; they add nothing but noise to traces.
        AspNetFilterFunction = context => !IsHealthCheckPath(context.Request.Path.Value)
    })
       .AddSpydersoftSerilog(true);

var healthCheckOptions = builder.AddSpydersoftHealthChecks();

builder.AddNpgsqlDbContext<PitStopDbContext>("pitstop-db");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        if (builder.Environment.IsEnvironment("Testing"))
        {
            var testKey = builder.Configuration["Auth:TestKey"]!;
            // The mock OIDC container (see AppHost) is treated as a real Authority here rather than
            // bypassed -- tokens it issues (from the browser-driven BFF login flow) are validated the
            // same way a real IdP's would be: issuer + signature checked via its discovery document.
            // The symmetric TestKey is kept as an additional trusted signer alongside that, since
            // DataSeeder mints its own tokens directly (no OIDC round-trip) for the API integration
            // suite; those tokens carry a matching "iss" so they validate against the same issuer.
            var mockOidcAuthority = builder.Configuration["Auth:MockOidcAuthority"] ?? "http://localhost:8200";
            options.Authority = mockOidcAuthority;
            options.RequireHttpsMetadata = false;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateAudience = false,
                ValidateLifetime = false,
                IssuerSigningKeys = [new SymmetricSecurityKey(Convert.FromBase64String(testKey))]
            };
        }
        else
        {
            options.Authority = builder.Configuration["Auth:Authority"];
            options.Audience = builder.Configuration["Auth:Audience"];
        }
    });
builder.Services.AddAuthorizationBuilder()
    .AddPolicy(AuthorizationPolicies.Read, p => p
        .RequireClaim(JwtRegisteredClaimNames.Sub)
        .RequireClaim("scope", AuthorizationPolicies.Read))
    .AddPolicy(AuthorizationPolicies.Write, p => p
        .RequireClaim(JwtRegisteredClaimNames.Sub)
        .RequireClaim("scope", AuthorizationPolicies.Write));

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddScoped<FillUpService>();
builder.Services.AddScoped<LocationService>();
builder.Services.AddSpydersoftFileStore(builder.Configuration);
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<INhtsaRecallClient, NhtsaRecallClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Nhtsa:BaseUrl"] ?? "https://api.nhtsa.gov/");
}).AddNhtsaResilienceHandler();
builder.Services.AddHttpClient<IVinDecoderClient, VpicVinDecoderClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Nhtsa:VpicBaseUrl"] ?? "https://vpic.nhtsa.dot.gov/api/");
}).AddNhtsaResilienceHandler();

// Spydersoft.Notification.Client registers INotificationClient/IDeviceClient with no auth of its
// own (unlike Spydersoft.FileStore.Client) -- layer the same client-credentials handler pattern on
// top of its typed HttpClient registration for the one client PitStop's backend actually calls.
builder.Services.AddSpydersoftNotification(builder.Configuration);
builder.Services.AddOptions<NotificationAuthOptions>().Bind(builder.Configuration.GetSection("Notification"));
builder.Services.AddHttpClient("Spydersoft.Notification.TokenClient");
builder.Services.AddTransient<NotificationClientCredentialsHandler>();
builder.Services.AddHttpClient<INotificationClient, NotificationHttpClient>()
    .AddHttpMessageHandler<NotificationClientCredentialsHandler>();
builder.Services.AddOptions<RecallCheckOptions>().Bind(builder.Configuration.GetSection("RecallCheck"));
builder.Services.AddScoped<RecallCheckRunner>();
builder.Services.AddHostedService<RecallCheckJob>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var ctx = scope.ServiceProvider.GetRequiredService<PitStopDbContext>();
    await ctx.Database.MigrateAsync();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseSpydersoftRequestLogging();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.UseSpydersoftHealthChecks(healthCheckOptions);

await app.RunAsync();

static bool IsHealthCheckPath(string? path) =>
    string.Equals(path, "/livez", StringComparison.OrdinalIgnoreCase) ||
    string.Equals(path, "/readyz", StringComparison.OrdinalIgnoreCase);
