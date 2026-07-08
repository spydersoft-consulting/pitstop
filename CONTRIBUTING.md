# Contributing to PitStop

Thanks for your interest in contributing! PitStop is a small self-hosted side project, but pull requests, bug reports, and feature ideas are welcome.

This document covers the workflow for getting a change merged. For local setup and project layout, see `src/api/docs/development.md` and `src/web/docs/development.md`. For the data model and HTTP API surface, see `src/api/docs/data-model.md` and `src/api/docs/api.md`.

This is a monorepo: the API (`src/api`), the web frontend (`src/web`), and the combined Helm chart (`charts/pitstop`) all live here and build/publish together from one pipeline (`.devops/pipeline-ci.yml`). A single change can touch API and UI code in the same PR — you don't need to coordinate across repos anymore.

## Ground rules

- **Be excellent to each other.** No code of conduct doc yet; the short version is: assume good faith, give actionable feedback, and don't be rude.
- **One change per PR.** Refactors, features, and unrelated cleanups should land separately. It makes review faster and rollbacks easier.
- **Tests stay green.** The pre-push hook runs the full unit test suite. Don't push past a red build.

## Before you start

For anything non-trivial — a new endpoint, a new screen, a schema change, a dependency bump that touches more than one file — open an issue first to sanity-check the direction. For small fixes and obvious bugs, just send the PR.

A few things are out of scope and will likely get closed:

- Changes that hardcode environment-specific URLs (OIDC authority, API addresses, OTLP endpoints) into `appsettings.json`. These are configured via environment variables in production (Helm) and via .NET Aspire env wiring + user secrets in dev. `appsettings.Development.json` is the right place for local-only values.
- Bypassing the BFF — for example, calling the data API directly from the React app with a token from local storage. The BFF exists so access tokens stay server-side. Keep them there.
- Net-new authentication/authorization mechanisms. The app speaks OAuth2/OIDC scope-based auth throughout. Adding API keys, basic auth, magic links, etc. is not on the roadmap.
- Vendor lock-in to a non-PostgreSQL database.

## Development setup

Prereqs: .NET 10 SDK, Docker Desktop, Node.js + Yarn (for git hooks and the UI).

```bash
yarn install                                          # installs husky hooks (repo root)

dotnet user-secrets set "OidcProxy:ClientId" "your-client-id" --project src/Spydersoft.PitStop.AppHost
dotnet user-secrets set "OidcProxy:ClientSecret" "your-client-secret" --project src/Spydersoft.PitStop.AppHost

dotnet run --project src/Spydersoft.PitStop.AppHost   # Postgres, data API, BFF, and the pitstop-ui dev server, all together
dotnet run --project src/api/src/Spydersoft.PitStop.DataSeeder  # seed test data, print token
```

You'll need an OIDC identity provider you control. See `src/web/docs/development.md#configure-your-oidc-provider` for redirect URIs and required scopes.

### NuGet authentication (required)

This repo references `Spydersoft.Platform.Hosting` from a GitHub Packages feed. You'll need a GitHub Personal Access Token with the `read:packages` scope. GitHub Packages requires authentication even for reading public packages — this is a known GitHub limitation, not something specific to this repo.

## Branch workflow

- `main` is protected and represents what's deployed (or about to be deployed).
- Feature work goes on `feature/<short-description>` branches.
- Bug fixes go on `fix/<short-description>` branches.
- Branch off `main`, rebase on `main` before opening the PR.

```bash
git checkout main && git pull
git checkout -b feature/your-change
# ... commits ...
git rebase main
git push -u origin feature/your-change
```

## Commit messages

Keep messages clean — subject line + body only. No `Co-Authored-By` trailers for AI tools, no `Generated with X` lines.

- Subject under 70 characters, imperative mood ("Add fill-up cost normalization", not "Added cost normalization")
- Body explains the _why_ when it isn't obvious from the diff
- One logical change per commit; squash WIP commits before pushing

## Pull requests

Open the PR against `main`. The CI pipeline (Azure DevOps, `.devops/pipeline-ci.yml`) will:

1. Restore dependencies from the GitHub Packages feed and build the whole solution (`Spydersoft.PitStop.slnx`)
2. Build the React UI (`yarn build` in `src/web/src/pitstop-ui`) and run its tests via Vitest
3. Run unit tests (`**/*.UnitTests/*.csproj`)
4. Run SonarCloud analysis (one combined project covering both API and BFF C# code, plus a separate project for the UI's TS/JS)

PRs need a green pipeline before merge. The pipeline does not build/push container images or publish the chart for PRs — that only happens on a tag push or a `feature/*` branch push, never on a plain `main` push or PR.

A good PR description:

- States what changed and why in 1–3 bullets
- Calls out anything that needs reviewer attention (tricky migration, breaking API change, breaking UX, accessibility concern)
- For UI changes, includes a screenshot or short clip if visual behavior changed
- Includes a test plan if behavior changed

## Code style

| Concern                | Tool                                      | Enforced when              |
| ---------------------- | ----------------------------------------- | -------------------------- |
| C# formatting          | `dotnet format`                           | pre-commit on `.cs`        |
| TypeScript / React     | ESLint + `eslint-plugin-react-hooks`      | pre-commit on staged files |
| Prettier formatting    | Prettier (120-char line width)            | pre-commit                 |
| `appsettings.*.json`   | Prettier with `prettier-plugin-sort-json` | pre-commit (alpha sort)    |
| JSON / YAML / Markdown | Prettier                                  | pre-commit                 |
| Line endings           | LF (see `.editorconfig`)                  | editor                     |
| Unit tests             | `dotnet test Spydersoft.PitStop.slnx`     | pre-push                   |

If you bypass a hook (`--no-verify`) you'll find out in CI. Don't.

### React conventions

- Function components with hooks. No class components for new code.
- Components live in `src/web/src/pitstop-ui/src/components/<Feature>/`. One feature per folder; the public component is the folder name (`Vehicles/index.tsx` or `Vehicles/Vehicles.tsx`).
- State lives in Redux Toolkit slices under `src/store/`. Local component state is fine for UI-only concerns (form fields, modal open/closed).
- Styling is Tailwind utility classes + PrimeReact components. Don't introduce a third styling system.
- Don't import from `src/web/src/pitstop-ui/src/api/generated/` directly in components — it's the raw `@hey-api/openapi-ts` output. Wrap calls in a slice or hook.

## Tests

- **API unit tests** live in `src/api/src/Spydersoft.PitStop.Api.UnitTests/`. NUnit, in-memory SQLite — no external services required.
- **API integration tests** (Playwright) live in `src/api/tests/api-integration/` and require a running API. Not part of the pre-push hook; run them manually or via CI.
- **UI tests** use Vitest with `@testing-library/react`:

  ```bash
  cd src/web/src/pitstop-ui
  yarn test
  ```

New endpoints should land with unit-test coverage of the controller and any service logic. New components with non-trivial logic (state transitions, conditional rendering on data shape, derived values) should land with tests — pure presentation components don't need them. There are no BFF-specific tests today; if you add logic to the BFF (custom claims transformer, new controller, request transform), please add tests.

## Schema migrations

EF Core migrations live in `src/api/src/Spydersoft.PitStop.Data/Migrations/`. Add a migration with:

```bash
dotnet ef migrations add <Name> \
  --project src/api/src/Spydersoft.PitStop.Data \
  --startup-project src/api/src/Spydersoft.PitStop.Api
```

Migrations are applied automatically on API startup. Don't edit a migration after it's merged to `main` — add a new one.

## Schema and API client

The TypeScript API client in `src/web/src/pitstop-ui/src/api/generated/` is generated from the data API's OpenAPI spec.

**If your change depends on an API change:**

1. Land the API change and run the API locally (`dotnet run --project src/Spydersoft.PitStop.AppHost`).
2. Regenerate the client: `cd src/web/src/pitstop-ui && yarn api:update`.
3. Commit the regenerated `pitstop.json` and `src/api/generated/` along with your UI change.

Don't hand-edit anything in `src/api/generated/`. It's overwritten on every regen.

## Reporting bugs

Open an issue with:

- What you did (request, command, action, or which page/click for UI issues)
- What you expected
- What happened instead (status code, error message, logs, or a screenshot/console output for UI issues)
- Environment: local Aspire / your own cluster / something else; browser + OS for UI issues

Security-sensitive issues: please email the maintainer (see the repo's GitHub profile) rather than opening a public issue.

## License

By contributing, you agree your contributions will be licensed under the [MIT License](LICENSE) covering this repository.
