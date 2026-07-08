# pitstop chart

Combined OCI chart for the PitStop application's own controllers: `data-api` and `web`. Published from this repo (`ghcr.io/spydersoft-consulting/charts/pitstop`), versioned alongside the container images.

This chart does **not** own or create any Kubernetes `Secret` — it has no `ExternalSecret`/Vault/Sealed-Secrets templates of any kind. It only references secrets **by name**, via `envFrom.secretRef`, with the secret name itself an overridable value. Whoever composes this chart (today: `pitstop-helm-config`) is responsible for actually creating those secrets with whatever provider they use.

Backing infrastructure (Postgres) is **not** in this chart. It's owned by `pitstop-helm-config`'s own `data-api` release.

## Values

- `controllers.data-api.containers.main.image.tag` — data-api image tag.
- `controllers.web.containers.main.image.tag` — web image tag.
- `controllers.data-api.containers.main.envFrom` / `controllers.web.containers.main.envFrom` — supplied entirely by the caller; not defaulted here (every real caller overrides this in full to add its own `configMapRef`s, so a partial default would be misleading — see the secrets contract below for what each secret must contain).
- `route.data-api.hostnames` / `route.web.hostnames` — per-environment hostnames; not defaulted here since every real caller supplies them.
- `controllers.web.containers.main.env` — **is** defaulted: sets `OidcProxySettings__ReverseProxy__Clusters__pitstopApi__Destinations__destination1__Address` to `http://{{ include "pitstop.fullname" . }}-data-api/`, computed via the chart's own naming helper. This is genuinely stable across every caller — both controllers always live in the same release/namespace — unlike the values above. Don't hardcode a literal service name here or in the caller's overlay; if you ever rename the release, this value moves with it automatically.

## Secrets contract

The caller must create a secret named **`data-api-secrets`** containing:

- `ConnectionStrings__pitstop-db` — Postgres connection string for the `data-api` controller.

The caller must create a secret named **`web-secrets`** containing:

- `OidcProxySettings__Oidc__Authority`
- `OidcProxySettings__Oidc__ClientId`
- `OidcProxySettings__Oidc__ClientSecret`

Neither secret name is hardcoded in this chart — both are supplied via the caller's `envFrom.secretRef.name` override, so a different composing repo could name/source them however it wants without any chart change.
