# Infrastructure & Deployment

## Container Image

- **Registry:** `ghcr.io/spydersoft-consulting/pitstop-data-api`
- **Base image:** `mcr.microsoft.com/dotnet/aspnet:10.0`
- **Port:** `8080` (HTTP)
- **Runs as:** non-root (`$APP_UID`)

The Dockerfile expects pre-published binaries copied into `/app`. The CI pipeline handles the publish step before the Docker build.

## CI Pipeline

The pipeline is defined in [`.devops/pipeline-ci.yml`](../.devops/pipeline-ci.yml) and runs on Azure DevOps using shared templates from `spydersoft-consulting/azure-devops-templates`.

**Triggers:**

- Push to `main` or `feature/*` branches
- Pull requests targeting `main`

**Steps (per the shared template):**

1. `dotnet restore` (using GitHub Packages feed via `SpydersoftGithub` credentials)
2. `dotnet test` on `**/*.UnitTests/*.csproj`
3. SonarCloud analysis (on `main` and PRs)
4. `dotnet publish` of the API project
5. Docker build and push to GHCR (skipped on PRs)

**Helm config update** (`updateHelmConfig`) is currently set to `false`. Wire this up once a Helmfile entry exists for pitstop in the ha-helm-config repo.

## Deployment

Follows the same Helmfile/ArgoCD GitOps pattern as `unifi-ipmanager` and `ha-entity-observer`.

**Target directory in ha-helm-config:** `apps/pitstop/`

**Environments:** test → stage → production

### Database

Use the shared PostgreSQL cluster with a dedicated `pitstop` database (preferred over a standalone bitnami/postgresql instance).

### Kubernetes Secrets

| Secret name         | Contents                                                       |
| ------------------- | -------------------------------------------------------------- |
| `pitstop-db-secret` | PostgreSQL connection string → `ConnectionStrings__pitstop-db` |
| `pitstop-oidc`      | `Auth__Authority`, `Auth__Audience`                            |

### Ingress

- Internal: `pitstop.home.lan`
- External: via existing ingress controller with TLS termination

## OAuth2 Client Setup

Three registrations are needed in the identity server at `auth.mattgerega.net`:

| Registration         | Type                | Grant                     | Purpose                         |
| -------------------- | ------------------- | ------------------------- | ------------------------------- |
| `data-api`           | API Resource        | —                         | Defines the audience and scopes |
| `pitstop-dev-client` | Confidential client | Client Credentials        | Local dev / tooling             |
| `pitstop-mobile`     | Public client       | Authorization Code + PKCE | Mobile app (Phase 2)            |

**API Scopes to create:**

- `pitstop:read` — read-only access to all endpoints
- `pitstop:write` — create, update, and delete access

## Health Check Endpoints

Provided by `Spydersoft.Platform.Hosting`:

| Path       | Purpose                                                     |
| ---------- | ----------------------------------------------------------- |
| `/livez`   | Liveness — always returns healthy if the process is running |
| `/readyz`  | Readiness — includes DB connectivity check                  |
| `/startup` | Startup — validates telemetry provider registration         |

## Observability

Telemetry is configured via `appsettings.json` under the `Telemetry` key. By default all OTLP exporters are disabled. To enable:

```json
{
  "Telemetry": {
    "ServiceName": "pitstop",
    "Trace": {
      "Otlp": { "Enabled": true, "Endpoint": "http://otel-collector:4317" }
    },
    "Metrics": {
      "Otlp": { "Enabled": true, "Endpoint": "http://otel-collector:4317" }
    },
    "Log": {
      "Otlp": { "Enabled": true, "Endpoint": "http://otel-collector:4317" }
    }
  }
}
```

Logging uses Serilog. Console output is structured with ANSI color themes in development.
