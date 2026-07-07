# PitStop

Fuel consumption tracking system. Monorepo combining the API (`src/api`) and web frontend (`src/web`), and the combined Helm chart (`charts/pitstop`) published as an OCI artifact and consumed by [`pitstop-helm-config`](https://github.com/spydersoft-consulting/pitstop-helm-config).

- `src/api` — .NET API (formerly `pitstop-api`).
- `src/web` — .NET/React web frontend (formerly `pitstop-web`).
- `charts/pitstop` — combined app chart (`data-api` + `web` controllers). See `charts/pitstop/README.md` for the secrets contract. Backing infrastructure (Postgres, `ExternalSecret`s) is owned by `pitstop-helm-config`, not this chart.
- `.devops/pipeline-ci.yml` — single build/publish pipeline (extends `pipelines/build-multi-container/v1.yml`): builds both solutions, publishes both container images and the combined chart, and bumps all three tags in `pitstop-helm-config` atomically from one build number.
