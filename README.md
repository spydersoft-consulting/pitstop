# PitStop

Fuel consumption tracking system. Monorepo combining the API (`src/api`) and web frontend (`src/web`), and the combined Helm chart (`charts/pitstop`) published as an OCI artifact and consumed by [`pitstop-helm-config`](https://github.com/spydersoft-consulting/pitstop-helm-config).

- `Spydersoft.PitStop.slnx` — single solution at the repo root, containing every project from `src/api` and `src/web` (in `/api/` and `/web/` solution folders) plus the single `src/Spydersoft.PitStop.AppHost` orchestration project.
- `src/Spydersoft.PitStop.AppHost` — the one .NET Aspire AppHost for local dev, running Postgres, the data API, the web BFF, and the `pitstop-ui` Vite dev server together. Replaces the two separate per-app AppHost projects that used to live under `src/api` and `src/web`.
- `src/api` — .NET API (formerly `pitstop-api`).
- `src/web` — .NET/React web frontend (formerly `pitstop-web`). `Spydersoft.PitStop.Frontend` builds and publishes `pitstop-ui` itself via MSBuild targets (`yarn install`/`yarn build`, output folded into `wwwroot`) instead of a `pitstop-ui.esproj` project reference — esproj support is limited, so the SPA build happens in plain `Exec` targets instead.
- `charts/pitstop` — combined app chart (`data-api` + `web` controllers). See `charts/pitstop/README.md` for the secrets contract. Backing infrastructure (Postgres, `ExternalSecret`s) is owned by `pitstop-helm-config`, not this chart.
- `.devops/pipeline-ci.yml` — single build/publish pipeline (extends `pipelines/build-multi-container/v1.yml`): builds the solution, publishes both container images and the combined chart, and bumps all three tags in `pitstop-helm-config` atomically from one build number.

`src/api`, `src/web`, and `src` (for the AppHost) each keep their own `Directory.Packages.props`/`nuget.config`/`global.json` — MSBuild resolves the nearest one per project directory, so these don't conflict with each other. Now that there's a single `AppHost` project, the earlier `Aspire.AppHost.Sdk` version mismatch between the two old AppHost projects (13.3.5 vs 13.2.2) is resolved — everything now pins 13.3.5.
