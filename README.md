# PitStop

Fuel consumption tracking system. Monorepo combining the API (`src/api`) and web frontend (`src/web`), and the combined Helm chart (`charts/pitstop`) published as an OCI artifact and consumed by [`pitstop-helm-config`](https://github.com/spydersoft-consulting/pitstop-helm-config).

- `src/api` — .NET API (formerly `pitstop-api`).
- `src/web` — .NET/React web frontend (formerly `pitstop-web`).
- `charts/pitstop` — combined app chart (`data-api` + `web` controllers). See `charts/pitstop/README.md` for the secrets contract. Backing infrastructure (Postgres, `ExternalSecret`s) is owned by `pitstop-helm-config`, not this chart.
- `.devops/pipeline-api.yml`, `.devops/pipeline-web.yml` — independent build/publish pipelines, each path-scoped to its own `src/*` subtree.
