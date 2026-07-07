# Development Guide

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js](https://nodejs.org/) (LTS) and [Yarn](https://yarnpkg.com/) — Yarn 4 is bundled via `packageManager` and Corepack
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — only if you're running [pitstop-api](https://github.com/spydersoft-consulting/pitstop-api) locally alongside the web frontend
- An OIDC identity provider you control (Keycloak, Duende IdentityServer, Auth0, etc.)
- A running instance of [pitstop-api](https://github.com/spydersoft-consulting/pitstop-api) — local or remote

## One-time setup

### 1. Install JS dependencies and git hooks

From the repo root:

```bash
yarn install
```

This installs root devDependencies (Prettier, lint-staged, Husky) and the `pitstop-ui` workspace dependencies, and activates the pre-commit hook.

### 2. Configure your OIDC provider

You need three things from your identity provider:

| Setting           | Value                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Client type       | Confidential web client                                                                  |
| Grant type        | Authorization Code with PKCE                                                             |
| Redirect URI      | `https://localhost:9081/.auth/login/callback` (dev) — your hosted URL for prod           |
| Post-logout URI   | `https://localhost:9081/`                                                                |
| Required scopes   | `openid`, `profile`, `email`, plus the scopes the API expects (`pitstop:read`, `pitstop:write` by default) |

The API scopes (`pitstop:read`, `pitstop:write`) are defined by the data API. See [pitstop-api/docs/infrastructure.md](https://github.com/spydersoft-consulting/pitstop-api/blob/main/docs/infrastructure.md) for the matching API-side registration.

### 3. Set BFF user secrets

Client credentials are loaded from .NET user secrets (never committed to the repo):

```bash
cd src/Spydersoft.PitStop.Web.AppHost
dotnet user-secrets set "OidcProxy:ClientId" "your-client-id"
dotnet user-secrets set "OidcProxy:ClientSecret" "your-client-secret"
```

### 4. Tell the BFF where the API lives

By default the AppHost expects the data API at `https://localhost:8081/`. To override:

```bash
dotnet user-secrets set "Services:DataApiUrl" "https://your-api-host/"
# Optional, only if you've also got the audit API running:
dotnet user-secrets set "Services:AuditApiUrl" "https://your-audit-host/"
```

The OIDC authority itself lives in `src/Spydersoft.PitStop.Frontend/appsettings.json` under `OidcProxySettings.Oidc.Authority`. For local dev, point this at your provider (a Development-environment override in `appsettings.Development.json` is the cleanest way — don't edit `appsettings.json` to hardcode a personal authority URL).

## Running locally

The AppHost project uses .NET Aspire to launch the BFF and the Vite dev server together:

```bash
dotnet run --project src/Spydersoft.PitStop.Web.AppHost
```

This starts:

| Component          | URL                       | Notes                                    |
| ------------------ | ------------------------- | ---------------------------------------- |
| Vite dev server    | `https://localhost:5200`  | The React UI with HMR                    |
| BFF (ASP.NET Core) | `https://localhost:9081`  | OIDC handler and YARP reverse proxy      |
| BFF (HTTP)         | `http://localhost:9080`   |                                          |
| Aspire dashboard   | (auto-opens)              | Logs, metrics, traces for both processes |

**Day-to-day workflow:** open `https://localhost:5200`. The Vite dev server proxies `/pitstop`, `/.auth`, `/livez`, and `/readyz` to the BFF, so login and API calls work the same way as in production.

The first run will prompt `dotnet dev-certs` to generate a localhost certificate for the Vite server (see `vite.config.mts`).

## Running the UI alone

If you only need the React UI and want to point at an already-running BFF (e.g. on a dev cluster):

```bash
cd src/pitstop-ui
yarn dev
```

The proxy targets in `vite.config.mts` default to `https://localhost:9081/`. Override `PORT` to use a different Vite port.

## Tests

### UI unit tests (Vitest)

```bash
cd src/pitstop-ui
yarn test           # watch mode with verbose reporter
yarn test-ui        # Vitest UI with coverage
yarn test-ci        # JUnit reporter + coverage (used in CI)
```

Tests live alongside source under `src/pitstop-ui/src/**/__tests__/` (or as `*.test.tsx`). Coverage output goes to `output/coverage/`.

### BFF tests

There are currently no unit tests for the BFF project — it's a thin wrapper around `OidcProxy.Net` and YARP. If you add logic to the BFF (a custom claims transformer, a new controller), please add tests.

## Regenerating the API client

The TypeScript API client in `src/pitstop-ui/src/api/generated/` is generated from the data API's OpenAPI spec using [`@hey-api/openapi-ts`](https://heyapi.dev/).

```bash
cd src/pitstop-ui
# With pitstop-api running locally on :8080:
yarn api:update           # downloads pitstop.json and regenerates

# Or step-by-step:
yarn api:spec             # downloads spec only
yarn api:generate         # regenerates from the existing pitstop.json
```

`pitstop.json` is committed so the UI can build without a running API. After pulling API changes that affect the contract, run `yarn api:update` and commit the regenerated client.

## Linting and formatting

| Concern                    | Tool                                  | Enforced when         |
| -------------------------- | ------------------------------------- | --------------------- |
| TypeScript / React         | ESLint + `eslint-plugin-react-hooks`  | pre-commit on staged files |
| Prettier formatting        | Prettier                              | pre-commit            |
| JSON / YAML / Markdown     | Prettier                              | pre-commit            |
| Line endings               | LF (see `.editorconfig`)              | editor                |

Run manually:

```bash
cd src/pitstop-ui
yarn lint                  # check
yarn lint:fix              # auto-fix
```

## Production build

```bash
cd src/pitstop-ui
yarn build                 # tsc + vite build → dist/

cd ../..
dotnet publish src/Spydersoft.PitStop.Frontend -c Release
```

The CI pipeline builds the UI first, copies `dist/` into the BFF's wwwroot, then publishes the .NET app and packages it as a Docker image.

## NuGet sources

The BFF references `Spydersoft.Platform.Hosting` from a GitHub Packages feed. Authentication is required:

```bash
dotnet nuget add source https://nuget.pkg.github.com/spydersoft-consulting/index.json \
  --name spydersoft-consulting \
  --username <github-username> \
  --password <github-pat>
```

The PAT needs `read:packages` scope. (GitHub Packages requires auth even for reading public packages.)

## Project Layout

```
src/Spydersoft.PitStop.Frontend/
  Program.cs                     # OidcProxy + YARP + telemetry wiring
  appsettings.json               # OIDC authority, reverse-proxy routes/clusters
  appsettings.Development.json   # local-dev cluster overrides

src/Spydersoft.PitStop.Web.AppHost/
  Program.cs                     # Aspire orchestration: BFF + Vite dev server

src/pitstop-ui/
  src/
    main.tsx                     # React entry point
    components/
      AppRouter.tsx              # react-router-dom routes
      Analytics/                 # MPG / spend charts
      Dashboard/                 # vehicle overview
      FillUpHistory/             # sortable fill-up list
      Vehicles/                  # CRUD UI
      Landing/                   # logged-out landing page
      NavigationBar/             # top nav + user menu
      layout/                    # shared layout pieces
    api/
      generated/                 # auto-generated openapi-ts client (do not edit)
    store/                       # Redux Toolkit slices
    context/                     # React context providers
    utils/
  pitstop.json                   # committed OpenAPI spec snapshot
  vite.config.mts                # Vite + Vitest config
```

## Troubleshooting

**`OidcProxy:ClientId is not set in user secrets`** — you skipped step 3 above. Set user secrets on the `Spydersoft.PitStop.Web.AppHost` project, not the Frontend project.

**Vite cert errors / `Could not create certificate`** — the `dotnet dev-certs https --trust` step needs to succeed at least once. On Linux/WSL you may need to set `NODE_EXTRA_CA_CERTS` to your trusted root.

**`401 Unauthorized` from `/pitstop/*`** — your OIDC client probably doesn't have the API scopes (`pitstop:read`, `pitstop:write`) listed in `appsettings.json`. Either grant those scopes on the client, or trim the scope list in `OidcProxySettings.Oidc.Scopes` to match what your provider allows.

**Login loop / token never persists** — check that the redirect URI registered in your identity provider matches *exactly*, including scheme, port, and trailing path (`/.auth/login/callback`).
