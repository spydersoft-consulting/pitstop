const string TestingEnvironmentName = "Testing";

var builder = DistributedApplication.CreateBuilder(args);

// --- Data API + Postgres ---

// Pin an explicit, stable password instead of Aspire's default random-per-run parameter -- the
// data volume below persists across launch profiles, but Postgres only sets its superuser password
// once, at first init. A password that drifts between runs locks you out of that volume's data.
var postgresPassword = builder.AddParameter(
    "postgres-password",
    value: builder.Configuration["Postgres:Password"] ?? "pitstop-local-dev-password",
    secret: true);

var postgres = builder.AddPostgres("postgres", password: postgresPassword, port: 8100);

if (builder.Environment.EnvironmentName != TestingEnvironmentName)
{
    postgres.WithDataVolume();
}

var db = postgres.AddDatabase("pitstop-db");

var api = builder.AddProject<Projects.Spydersoft_PitStop_Api>("api", launchProfileName: "https")
    .WithEndpoint("http", e => { e.Port = 8080; e.TargetPort = 8080; e.IsProxied = false; })
    .WithEndpoint("https", e => { e.Port = 8081; e.TargetPort = 8081; e.IsProxied = false; })
    .WithEnvironment("Telemetry__Log__Type", "otlp")
    .WithEnvironment("Telemetry__Metrics__Type", "otlp")
    .WithEnvironment("Telemetry__Trace__Type", "otlp")
    .WithReference(db)
    .WaitFor(db);

// The seeder is a one-shot console app (applies migrations, inserts sample data, then exits) --
// it isn't something that should restart every time the AppHost does. Testing wires it up to run
// automatically as part of e2e setup; everywhere else it's added with WithExplicitStart() so it
// just sits in the dashboard until you click "Start" to seed whatever local Postgres it's pointed at.
var dataSeeder = builder.AddProject<Projects.Spydersoft_PitStop_DataSeeder>("data-seeder")
    .WithReference(db)
    .WaitFor(db);

if (builder.Environment.EnvironmentName == TestingEnvironmentName)
{
    var testKey = builder.Configuration["Auth:TestKey"]
        ?? "jRv3YFPH/19t9t5CgsEFgAkykfW5bQhHmceMprLgzlQ=";

    api.WithEnvironment("DOTNET_ENVIRONMENT", TestingEnvironmentName)
       .WithEnvironment("Auth__TestKey", testKey);

    dataSeeder.WaitFor(api)
        .WithEnvironment("PITSTOP_TEST_KEY", testKey);
}
else
{
    dataSeeder.WithExplicitStart();
}

// --- Web frontend (BFF + Vite UI) ---

string clientId, clientSecret, authority;
IResourceBuilder<ContainerResource>? mockOidc = null;

// The Testing environment (used for Playwright/e2e runs) always uses the mock IdP, but the mock
// can also be requested independently -- e.g. a "Local" launch profile for interactive dev that
// still wants Postgres data persistence and skips the data-seeder/testkey wiring above.
var useMockOidc = builder.Environment.EnvironmentName == TestingEnvironmentName
    || bool.TryParse(builder.Configuration["UseMockOidc"], out var useMockOidcConfig) && useMockOidcConfig;

if (useMockOidc)
{
    const string mockClientId = "pitstop-web-test";
    const string mockClientSecret = "pitstop-web-test-secret";

    mockOidc = builder.AddContainer("mock-oidc", "ghcr.io/soluto/oidc-server-mock", "latest")
        .WithHttpEndpoint(port: 8200, targetPort: 80, name: "http", isProxied: false)
        .WithEnvironment("ASPNETCORE_ENVIRONMENT", "Development")
        // This binds the mock IdP container's own internal listener, reachable only from
        // localhost within the Testing environment -- not a production endpoint.
        .WithEnvironment("ASPNETCORE_URLS", "http://+:80") // NOSONAR
        .WithEnvironment("CLIENTS_CONFIGURATION_INLINE", MockOidcClientsJson(mockClientId, mockClientSecret))
        .WithEnvironment("USERS_CONFIGURATION_INLINE", MockOidcUsersJson())
        .WithEnvironment("API_SCOPES_INLINE", MockOidcApiScopesJson())
        // Duende IdentityServer's default idsrv/idsrv.session cookies use SameSite=None, which
        // browsers require to be paired with Secure — but this mock runs over plain http (see the
        // AlwaysRedirectToHttps note below), so those cookies get silently dropped and login loops
        // forever. Relax to Lax, which plain top-level redirect navigations satisfy.
        .WithEnvironment("SERVER_OPTIONS_INLINE", MockOidcServerOptionsJson());

    clientId = mockClientId;
    clientSecret = mockClientSecret;
    authority = "http://localhost:8200";
}
else
{
    clientId = builder.Configuration["OidcProxy:ClientId"]
        ?? throw new InvalidOperationException("OidcProxy:ClientId is not set in user secrets.");
    clientSecret = builder.Configuration["OidcProxy:ClientSecret"]
        ?? throw new InvalidOperationException("OidcProxy:ClientSecret is not set in user secrets.");
    authority = "https://auth.mattgerega.net";
}

// The api project's https endpoint (8081) is declared above via WithEndpoint but Kestrel in this
// Testing setup only ends up bound to the http endpoint (8080) -- route the BFF's reverse proxy at
// the endpoint that's actually listening rather than the unreachable https one. This takes priority
// over the appsettings.json default (which always resolves Services:DataApiUrl to the https address)
// since that default isn't environment-aware.
var dataApiUrl = builder.Environment.EnvironmentName == TestingEnvironmentName
    ? "http://localhost:8080/"
    : builder.Configuration["Services:DataApiUrl"] ?? "https://localhost:8081/";
var auditApiUrl = builder.Configuration["Services:AuditApiUrl"] ?? "https://localhost:8082/";

var frontendProjectDir = Path.GetFullPath(
    Path.Combine(builder.Environment.ContentRootPath, "..", "web", "src", "Spydersoft.PitStop.Frontend"));

builder.AddViteApp("pitstop-ui", "../web/src/pitstop-ui")
    .WithYarn()
    .WithEndpoint("http", e => { e.Port = 5200; e.IsProxied = false; e.UriScheme = "https"; });

var web = builder.AddProject<Projects.Spydersoft_PitStop_Frontend>("web", launchProfileName: "https")
    .WithEndpoint("http", e => { e.Port = 9080; e.TargetPort = 9080; e.IsProxied = false; })
    .WithEndpoint("https", e => { e.Port = 9081; e.TargetPort = 9081; e.IsProxied = false; })
    .WithEnvironment("ASPNETCORE_CONTENTROOT", frontendProjectDir)
    .WithEnvironment("OidcProxySettings__Oidc__Authority", authority)
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

if (mockOidc is not null)
{
    // OidcProxy.Net always rewrites its own redirect_uri to https unless told otherwise. The web
    // project's https endpoint isn't reachable under this Aspire/Testing setup (see comment in
    // playwright.config.ts), so keep the http scheme it can actually reach.
    web.WithEnvironment("OidcProxySettings__AlwaysRedirectToHttps", "false");
    web.WaitFor(mockOidc);
}

await builder.Build().RunAsync();

static string MockOidcClientsJson(string clientId, string clientSecret) => $$"""
[
  {
    "ClientId": "{{clientId}}",
    "ClientSecrets": ["{{clientSecret}}"],
    "AllowedGrantTypes": ["authorization_code"],
    "AllowedScopes": ["openid", "profile", "email", "pitstop:read", "pitstop:write"],
    "RedirectUris": ["http://localhost:9080/.auth/login/callback"],
    "PostLogoutRedirectUris": ["http://localhost:9080/"],
    "RequireConsent": false,
    "RequirePkce": false,
    "AllowOfflineAccess": true
  }
]
""";

static string MockOidcUsersJson() => """
[
  {
    "SubjectId": "1",
    "Username": "testuser",
    "Password": "Test123!",
    "Claims": [
      { "Type": "name", "Value": "Test User" },
      { "Type": "email", "Value": "testuser@example.com" }
    ]
  }
]
""";

static string MockOidcApiScopesJson() => """
[
  { "Name": "pitstop:read", "DisplayName": "Read PitStop data" },
  { "Name": "pitstop:write", "DisplayName": "Write PitStop data" }
]
""";

static string MockOidcServerOptionsJson() => """
{
  "Authentication": {
    "CookieSameSiteMode": "Lax",
    "CheckSessionCookieSameSiteMode": "Lax"
  }
}
""";
