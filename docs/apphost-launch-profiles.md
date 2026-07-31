# AppHost launch profiles

`src/Spydersoft.PitStop.AppHost` (`Properties/launchSettings.json`) defines three launch profiles. Pick one based on what you're doing:

## `Local`

Interactive local development against a mock OIDC provider. No external dependencies, no user secrets required.

- `DOTNET_ENVIRONMENT=Development`
- `UseMockOidc=true` — spins up the `ghcr.io/soluto/oidc-server-mock` container (`mock-oidc`) and points the `web` BFF at it (`http://localhost:8200`). Test user: `testuser` / `Test123!`.
- Postgres keeps its data volume (state persists across restarts), unlike `Testing`.
- No `Auth__TestKey` — that's `Testing`-only.
- `data-seeder` is present but added with `WithExplicitStart()`, so it won't run on its own — see [Seeding local data](#seeding-local-data).

Run with:

```sh
dotnet run --project src/Spydersoft.PitStop.AppHost --launch-profile Local
```

## `Remote`

Local development against the real identity provider at `https://auth.mattgerega.net`, for exercising real login flows or when new components (audit service, file store, etc.) need to be pointed at hosted test infrastructure instead of localhost.

- `DOTNET_ENVIRONMENT=Development`
- `UseMockOidc` unset (falsy) — `Program.cs` falls into the "real auth" branch and requires AppHost user secrets:
  - `OidcProxy:ClientId`
  - `OidcProxy:ClientSecret`
- Postgres keeps its data volume, same as `Local`.

Run with:

```sh
dotnet run --project src/Spydersoft.PitStop.AppHost --launch-profile Remote
```

As new components (file store, audit service, etc.) are wired into AppHost, follow the existing `Services:XUrl` config pattern (see `Services:DataApiUrl` / `Services:AuditApiUrl` in `Program.cs`) to let this profile point them at test-environment URLs instead of localhost, rather than hardcoding a separate profile per service.

## `Testing`

Full e2e/Playwright mode. Used by `src/api/tests/api-integration/playwright.config.ts` and `src/web/tests/web-integration/playwright.config.ts` — not typically launched by hand.

- `DOTNET_ENVIRONMENT=Testing`
- Mock OIDC is always on (`EnvironmentName == "Testing"` short-circuits the same check `Local` uses `UseMockOidc` for).
- Postgres does **not** get a data volume — each run starts clean.
- Adds the `data-seeder` project and a shared `Auth__TestKey` for API-level test auth.
- `data-seeder` runs automatically here (`WaitFor(api)`, no `WithExplicitStart()`) — e2e runs need seeded data every time, on a fresh, volume-less Postgres.
- `launchBrowser: false`.

## Seeding local data

`data-seeder` (`src/api/src/Spydersoft.PitStop.DataSeeder`) applies EF migrations and inserts sample data (a test vehicle with fill-up history) against whatever Postgres it's pointed at. It's a one-shot console app — it exits once seeding finishes — so under `Local` and `Remote` it's added with `WithExplicitStart()`: it shows up in the Aspire dashboard as a resource, but won't run until you click **Start** on it. That keeps it from re-seeding (and logging "already exists, skipping") every single AppHost launch when Postgres already has your data volume from a previous run.

To seed: launch AppHost with `Local` or `Remote`, open the dashboard, find `data-seeder`, and click **Start**. `Testing` doesn't need this — it wires the seeder to run automatically since every e2e run starts from an empty database.

## How the switch works

`Program.cs` computes a single `useMockOidc` flag:

```csharp
var useMockOidc = builder.Environment.EnvironmentName == TestingEnvironmentName
    || bool.TryParse(builder.Configuration["UseMockOidc"], out var useMockOidcConfig) && useMockOidcConfig;
```

`Testing` gets mock OIDC unconditionally (it needs deterministic auth for e2e runs); `Local` gets it by opting in via the `UseMockOidc` env var without inheriting the rest of `Testing`'s e2e-only behavior (data-seeder, ephemeral Postgres, test key). `Remote` leaves the flag unset and falls through to the real-authority branch.

## Postgres password is pinned, not random

`Local` and `Remote` both keep Postgres's data volume, so its data (and the underlying container's superuser password, set once at first init) persists across restarts _and_ across whichever of those two profiles you launch. `Program.cs` pins an explicit `postgres-password` parameter (default `pitstop-local-dev-password`, overridable via `Postgres:Password` in AppHost user secrets/config) instead of letting Aspire generate one — a value that drifted between runs would leave Aspire unable to authenticate against the existing volume, forcing a volume wipe to recover. If you already hit that mismatch before this fix landed, you'll need to clear the `postgres` data volume once (`docker volume ls` / `docker volume rm`) to get back in sync; after that it should stay stable across profile switches.

### Setting your own password

The shared default (`pitstop-local-dev-password`) is fine to leave as-is, but if you want your own, set `Postgres:Password` before your Postgres volume is first initialized — once a volume exists, changing this only causes a mismatch, same as the drift problem above.

User secrets (preferred — doesn't land in shell history or env vars):

```sh
dotnet user-secrets set "Postgres:Password" "whatever-you-want" --project src/Spydersoft.PitStop.AppHost
```

Or an environment variable (`Postgres:Password` maps to `Postgres__Password`):

```sh
setx Postgres__Password "whatever-you-want"
```
