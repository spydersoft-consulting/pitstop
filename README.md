# PitStop

Fuel consumption tracking system. Monorepo combining the API (`src/api`) and web frontend (`src/web`), and the combined Helm chart (`charts/pitstop`) published as an OCI artifact and consumed by [`pitstop-helm-config`](https://github.com/spydersoft-consulting/pitstop-helm-config).

- `Spydersoft.PitStop.slnx` — single solution at the repo root, containing all projects from both `src/api` and `src/web` (in `/api/` and `/web/` solution folders).
- `src/api` — .NET API (formerly `pitstop-api`).
- `src/web` — .NET/React web frontend (formerly `pitstop-web`).
- `charts/pitstop` — combined app chart (`data-api` + `web` controllers). See `charts/pitstop/README.md` for the secrets contract. Backing infrastructure (Postgres, `ExternalSecret`s) is owned by `pitstop-helm-config`, not this chart.
- `.devops/pipeline-ci.yml` — single build/publish pipeline (extends `pipelines/build-multi-container/v1.yml`): builds the solution, publishes both container images and the combined chart, and bumps all three tags in `pitstop-helm-config` atomically from one build number.

Each of `src/api` and `src/web` keeps its own `Directory.Packages.props`/`nuget.config` (MSBuild resolves the nearest one per project directory, so this doesn't conflict) — but note the two `AppHost` projects currently pin **different** `Aspire.AppHost.Sdk` versions (api: 13.3.5, web: 13.2.2). Now that both build in one solution, MSBuild resolves that SDK once and one of the two AppHost projects silently builds against the other's version. Not yet reconciled — see git history/issues for status.
