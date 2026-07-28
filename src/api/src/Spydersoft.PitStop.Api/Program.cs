using Spydersoft.PitStop.Api;
using Spydersoft.PitStop.Api.Services;
using Spydersoft.PitStop.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
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
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = false,
                IssuerSigningKey = new SymmetricSecurityKey(Convert.FromBase64String(testKey))
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
