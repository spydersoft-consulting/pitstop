# Development Guide

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for local PostgreSQL via Aspire)
- [Node.js](https://nodejs.org/) + [Yarn](https://yarnpkg.com/) (for git hooks)

## Local Development

The AppHost project uses .NET Aspire to spin up the API and a PostgreSQL container together.

```bash
dotnet run --project src/Spydersoft.PitStop.AppHost
```

This starts:

- A PostgreSQL container named `pitstop-db`
- The API, waiting for the database to be ready
- The Aspire dashboard at `https://localhost:8001`
- The API on `http://localhost:8080` (https `:8081`); Postgres on `:8100`

The API applies EF Core migrations automatically on startup.

## Test Data

The DataSeeder seeds a test vehicle with 12 months of realistic fill-up data and prints a JWT token for use with the API.

```bash
# Seed data and print token
dotnet run --project src/Spydersoft.PitStop.DataSeeder

# Print token only (no seeding)
dotnet run --project src/Spydersoft.PitStop.DataSeeder -- --token-only
```

**Environment variables:**

| Variable                    | Default                                                               | Description                    |
| --------------------------- | --------------------------------------------------------------------- | ------------------------------ |
| `PITSTOP_CONNECTION_STRING` | `Host=localhost;Database=pitstop;Username=postgres;Password=postgres` | PostgreSQL connection          |
| `PITSTOP_TEST_KEY`          | hardcoded dev key                                                     | Base64 HMAC-SHA256 signing key |

The generated token contains only a `sub` claim (`seeder-test-user`). It does **not** include `pitstop:read` or `pitstop:write` scope claims, so it will be rejected by the API's scope policies. Use a real token from `auth.mattgerega.net` for manual API testing, or configure the identity server client to include the required scopes.

## Unit Tests

```bash
dotnet test Spydersoft.PitStop.slnx
```

Tests are in `src/Spydersoft.PitStop.Api.UnitTests/` and use NUnit with an in-memory SQLite database. No running API or external services required.

## Integration Tests

Playwright-based API tests live in `tests/api-integration/`. They require a running API instance and a valid token.

```bash
cd tests/api-integration
yarn install
PITSTOP_BASE_URL=http://localhost:8080 PITSTOP_TEST_TOKEN=<token> yarn test
```

These are not run as part of the pre-push hook — they are intended for CI or manual post-deploy verification.

## Git Hooks

Hooks are managed by [Husky](https://typicode.github.io/husky/) and installed via Yarn.

```bash
yarn install   # installs deps and activates hooks (requires git repo)
```

| Hook         | Runs            | What it does                                          |
| ------------ | --------------- | ----------------------------------------------------- |
| `pre-commit` | on `git commit` | `dotnet format` on staged `.cs` files via lint-staged |
| `pre-push`   | on `git push`   | `dotnet test` on the full solution                    |

## Code Style

- **Formatting:** `dotnet format` (enforced on commit)
- **JSON / YAML:** Prettier with 120-char line width (see `.prettierrc`)
- **Line endings:** LF (see `.editorconfig`)
- **`appsettings.*.json`:** Keys sorted alphabetically by Prettier on commit

## NuGet Sources

The project references `Spydersoft.Platform.Hosting` from the GitHub Packages feed. Authentication is required:

```bash
dotnet nuget add source https://nuget.pkg.github.com/spydersoft-consulting/index.json \
  --name spydersoft-consulting \
  --username <github-username> \
  --password <github-pat>
```

The PAT needs `read:packages` scope.

## Project Layout

```
src/Spydersoft.PitStop.Api/
  Controllers/
    AnalyticsController.cs      # GET analytics endpoints
    FillUpsController.cs        # CRUD fill-ups
    VehiclesController.cs       # CRUD vehicles
    PitStopControllerBase.cs    # GetCurrentUserId() helper
  Services/
    FillUpService.cs            # RecalculateComputedFieldsAsync
  AuthorizationPolicies.cs      # Scope policy name constants
  Program.cs                    # Startup / DI wiring

src/Spydersoft.PitStop.Data/
  Entities/                     # Vehicle, FillUp, FuelGrade
  PitStopDbContext.cs
  Migrations/

src/Spydersoft.PitStop.Contracts/
  Vehicles/                     # VehicleDto, CreateVehicleRequest, UpdateVehicleRequest
  FillUps/                      # FillUpDto, FillUpListResponse, CreateFillUpRequest, etc.
  Analytics/                    # SummaryResponse, MpgOverTimeResponse, SpendResponse
```
