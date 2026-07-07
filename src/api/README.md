# PitStop API

A self-hosted fuel consumption tracking API. Replaces manual spreadsheet tracking with a REST API backed by PostgreSQL, deployable on a home Kubernetes cluster.

The web frontend lives at [spydersoft-consulting/pitstop-web](https://github.com/spydersoft-consulting/pitstop-web) — a React UI fronted by an OIDC-protected BFF (`OidcProxy.Net`) that calls this API. The two repos can be developed independently; together they form a complete app.

## Features

- Log and manage fill-ups per vehicle
- Automatic MPG and cost-per-mile calculation
- Analytics endpoints for trends, spend, and rolling averages
- Multi-vehicle support with per-user data isolation
- OAuth2/OIDC authentication via scope-based authorization

## Tech Stack

| Layer | Technology |
|---|---|
| API | ASP.NET Core (.NET 10) |
| ORM | Entity Framework Core |
| Database | PostgreSQL |
| Auth | OAuth2/OIDC (auth.mattgerega.net) |
| Local dev | .NET Aspire |
| Container | Docker (ghcr.io/spydersoft-consulting/pitstop-data-api) |
| CI | Azure DevOps |

## Quick Start

**Prerequisites:** .NET 10 SDK, Docker Desktop

```bash
# Start API + Postgres via Aspire
dotnet run --project src/Spydersoft.PitStop.AppHost

# In another terminal — seed test data and print a test token
dotnet run --project src/Spydersoft.PitStop.DataSeeder
```

The Aspire dashboard opens at `https://localhost:8001` (or `http://localhost:8000`). The API listens on `http://localhost:8080` and `https://localhost:8081`.

## Project Structure

```
src/
  Spydersoft.PitStop.Api/          # ASP.NET Core REST API
  Spydersoft.PitStop.AppHost/      # .NET Aspire local orchestration
  Spydersoft.PitStop.Contracts/    # Shared request/response DTOs
  Spydersoft.PitStop.Data/         # EF Core DbContext and entities
  Spydersoft.PitStop.DataSeeder/   # Test data seeder and JWT generator
tests/
  api-integration/                 # Playwright API integration tests
.devops/
  pipeline-ci.yml                  # Azure DevOps CI pipeline
```

## Documentation

- [API Reference](docs/api.md)
- [Data Model](docs/data-model.md)
- [Development Guide](docs/development.md)
- [Infrastructure & Deployment](docs/infrastructure.md)
- [Contributing](CONTRIBUTING.md)

## License

Released under the [MIT License](LICENSE).
