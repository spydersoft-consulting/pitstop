# PitStop Web

The web frontend for [PitStop](https://github.com/spydersoft-consulting/pitstop-api) — a self-hosted fuel consumption tracker. A React UI fronted by an ASP.NET Core BFF that handles OIDC login and reverse-proxies API calls to the backend services.

The backend API lives in [spydersoft-consulting/pitstop-api](https://github.com/spydersoft-consulting/pitstop-api). The two repos can be developed independently; together they form the full app.

## Features

- Vehicle dashboard with MPG, spend, and cost-per-mile charts
- Fill-up history with sortable columns and per-vehicle filtering
- Vehicle management (add, edit, archive)
- OIDC login via your own identity provider (no shared accounts)
- Server-side token handling — access tokens never leave the BFF

## Tech Stack

| Layer       | Technology                                                |
| ----------- | --------------------------------------------------------- |
| UI          | React 19, TypeScript, Vite, PrimeReact, Tailwind, Chart.js|
| BFF         | ASP.NET Core (.NET 10) + `OidcProxy.Net` + YARP           |
| State       | Redux Toolkit                                             |
| Auth        | OAuth2 / OIDC (Authorization Code + PKCE)                 |
| Local dev   | .NET Aspire                                               |
| Container   | Docker (ghcr.io/spydersoft-consulting/pitstop-web)        |
| CI          | Azure DevOps                                              |

## Architecture

```
       browser
          |
          v
   +-----------------+        +--------------+
   | PitStop Web BFF | -----> | pitstop-api  |
   | (OidcProxy.Net) |        | (data-api)   |
   +-----------------+        +--------------+
          |                          |
          v                          v
   identity provider           PostgreSQL
   (OIDC)
```

The BFF (`Spydersoft.PitStop.Frontend`) does three things:

1. Serves the static React bundle (`pitstop-ui`)
2. Handles OIDC login/logout and stores tokens server-side
3. Reverse-proxies `/pitstop/*` to the data API with the user's access token attached

The React UI never touches OIDC directly. It makes same-origin calls to `/pitstop/*` and the BFF forwards them.

## Quick Start

**Prerequisites:** .NET 10 SDK, Node.js + Yarn, Docker Desktop (if also running pitstop-api locally), an OIDC identity provider you control, a running [pitstop-api](https://github.com/spydersoft-consulting/pitstop-api).

```bash
# 1. Install hooks and JS deps
yarn install

# 2. Configure OIDC client secrets (user secrets, not committed)
cd src/Spydersoft.PitStop.Web.AppHost
dotnet user-secrets set "OidcProxy:ClientId" "your-client-id"
dotnet user-secrets set "OidcProxy:ClientSecret" "your-client-secret"

# 3. Run the BFF + Vite dev server together via Aspire
cd ../..
dotnet run --project src/Spydersoft.PitStop.Web.AppHost
```

The Aspire dashboard opens automatically. The Vite dev server runs at `https://localhost:5200` and the BFF at `https://localhost:9081`.

Full setup — including how to point at your own identity provider and the API — is in [docs/development.md](docs/development.md).

## Project Structure

```
src/
  Spydersoft.PitStop.Frontend/        # ASP.NET Core BFF (OidcProxy + YARP)
  Spydersoft.PitStop.Web.AppHost/     # .NET Aspire local orchestration
  pitstop-ui/                         # React SPA (Vite, TypeScript)
    src/
      components/                     # Analytics, Dashboard, FillUpHistory, Vehicles, etc.
      api/                            # auto-generated TS client (from API's OpenAPI spec)
      store/                          # Redux Toolkit slices
      layouts/                        # Main app layout
```

## Documentation

- [Development Guide](docs/development.md) — local setup, OIDC config, API client regeneration
- [Contributing](CONTRIBUTING.md) — branch workflow, PR process, code style

## License

Released under the [MIT License](LICENSE).
