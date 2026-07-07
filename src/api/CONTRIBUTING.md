# Contributing to PitStop API

Thanks for your interest in contributing! PitStop is a small self-hosted side project, but pull requests, bug reports, and feature ideas are welcome.

This document covers the workflow for getting a change merged. For local setup and project layout, see [docs/development.md](docs/development.md). For the data model and HTTP API surface, see [docs/data-model.md](docs/data-model.md) and [docs/api.md](docs/api.md).

The frontend lives in a separate repo: [pitstop-web](https://github.com/spydersoft-consulting/pitstop-web). If your change affects request/response shapes, expect to update both repos.

## Ground rules

- **Be excellent to each other.** No code of conduct doc yet; the short version is: assume good faith, give actionable feedback, and don't be rude.
- **One change per PR.** Refactors, features, and unrelated cleanups should land separately. It makes review faster and rollbacks easier.
- **Tests stay green.** The pre-push hook runs the full unit test suite. Don't push past a red build.

## Before you start

For anything non-trivial — a new endpoint, schema change, dependency bump that touches more than one file — open an issue first to sanity-check the direction. For small fixes and obvious bugs, just send the PR.

A few things are out of scope and will likely get closed:

- Changes that hardcode environment-specific URLs (OIDC authority, OTLP endpoints, downstream service addresses) into `appsettings.json`. These are configured via environment variables in production (Helm) and via `.NET Aspire` env wiring in dev.
- Net-new authentication/authorization mechanisms. The API speaks OAuth2/OIDC scope-based auth. Adding API keys, basic auth, etc. is not on the roadmap.
- Vendor lock-in to a non-PostgreSQL database.

## Development setup

Full instructions are in [docs/development.md](docs/development.md). The short version:

```bash
# Prereqs: .NET 10 SDK, Docker Desktop, Node.js + Yarn (for git hooks)

yarn install                                                # installs husky hooks
dotnet run --project src/Spydersoft.PitStop.AppHost          # API + Postgres via Aspire
dotnet run --project src/Spydersoft.PitStop.DataSeeder       # seed test data, print token
```

### NuGet authentication (required)

This project references `Spydersoft.Platform.Hosting` from a GitHub Packages feed. You'll need a GitHub Personal Access Token with the `read:packages` scope. See [docs/development.md#nuget-sources](docs/development.md#nuget-sources).

GitHub Packages requires authentication even for reading public packages. This is a known GitHub limitation, not something specific to this repo.

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
- Body explains the *why* when it isn't obvious from the diff
- One logical change per commit; squash WIP commits before pushing

## Pull requests

Open the PR against `main`. The CI pipeline (Azure DevOps) will:

1. Restore dependencies from the GitHub Packages feed
2. Run unit tests (`**/*.UnitTests/*.csproj`)
3. Run SonarCloud analysis

PRs need a green pipeline before merge. The pipeline does not build or push container images for PRs — that happens on merge to `main`.

A good PR description:

- States what changed and why in 1–3 bullets
- Calls out anything that needs reviewer attention (tricky migration, breaking API change, etc.)
- Includes a test plan if behavior changed

## Code style

| Concern              | Tool                                            | Enforced when           |
| -------------------- | ----------------------------------------------- | ----------------------- |
| C# formatting        | `dotnet format`                                 | pre-commit on `.cs`     |
| JSON / YAML / MD     | Prettier (120-char line width)                  | pre-commit              |
| `appsettings.*.json` | Prettier with `prettier-plugin-sort-json`       | pre-commit (alpha sort) |
| Line endings         | LF (see `.editorconfig`)                        | editor                  |
| Unit tests           | `dotnet test Spydersoft.PitStop.slnx`           | pre-push                |

If you bypass a hook (`--no-verify`) you'll find out in CI. Don't.

## Tests

- **Unit tests** live in `src/Spydersoft.PitStop.Api.UnitTests/`. They use NUnit and an in-memory SQLite database — no external services required.
- **Integration tests** (Playwright) live in `tests/api-integration/` and require a running API. They're not part of the pre-push hook; run them manually or via CI.

New endpoints should land with unit-test coverage of the controller and any service logic. Schema migrations should be exercised by the test that depends on them.

## Schema migrations

EF Core migrations live in `src/Spydersoft.PitStop.Data/Migrations/`. Add a migration with:

```bash
dotnet ef migrations add <Name> \
  --project src/Spydersoft.PitStop.Data \
  --startup-project src/Spydersoft.PitStop.Api
```

Migrations are applied automatically on API startup. Don't edit a migration after it's merged to `main` — add a new one.

## Reporting bugs

Open an issue with:

- What you did (request, command, action)
- What you expected
- What happened instead (status code, error message, logs if available)
- Environment: local Aspire / your own cluster / something else

Security-sensitive issues: please email the maintainer (see the repo's GitHub profile) rather than opening a public issue.

## License

By contributing, you agree your contributions will be licensed under the [MIT License](LICENSE) covering this repository.
