# Contributing to PitStop Web

Thanks for your interest in contributing! PitStop is a small self-hosted side project, but pull requests, bug reports, and feature ideas are welcome.

This document covers the workflow for getting a change merged. For local setup, OIDC configuration, and project layout, see [docs/development.md](docs/development.md).

The backend API lives in a separate repo: [pitstop-api](https://github.com/spydersoft-consulting/pitstop-api). If your change adds or modifies an endpoint contract, you'll likely need a coordinated PR there too — and a regenerated TS client here (see "Schema and API client" below).

## Ground rules

- **Be excellent to each other.** No code of conduct doc yet; the short version is: assume good faith, give actionable feedback, and don't be rude.
- **One change per PR.** Refactors, features, and unrelated cleanups should land separately.
- **Tests stay green.** UI tests run in CI. Don't push past a red build.

## Before you start

For anything non-trivial — a new screen, a new BFF route, a dependency major-version bump, restructuring shared layout — open an issue first to sanity-check the direction. For small fixes, just send the PR.

A few things are out of scope:

- Hardcoded environment-specific URLs (OIDC authority, API addresses, OTLP endpoints) in `appsettings.json`. These are configured via environment variables in production (Helm) and via Aspire env wiring + user secrets in dev. The Development override file (`appsettings.Development.json`) is the right place for local-only values.
- Bypassing the BFF — for example, calling the data API directly from the React app with a token from local storage. The BFF exists so access tokens stay server-side. Keep them there.
- Adding alternate authentication mechanisms (basic auth, API keys, magic links). The app is built around OIDC.

## Development setup

Full instructions are in [docs/development.md](docs/development.md). The very short version:

```bash
yarn install
cd src/Spydersoft.PitStop.Web.AppHost
dotnet user-secrets set "OidcProxy:ClientId" "your-client-id"
dotnet user-secrets set "OidcProxy:ClientSecret" "your-client-secret"
cd ../..
dotnet run --project src/Spydersoft.PitStop.Web.AppHost
```

You'll need an OIDC identity provider you control and a running instance of [pitstop-api](https://github.com/spydersoft-consulting/pitstop-api). See [docs/development.md](docs/development.md#configure-your-oidc-provider) for redirect URIs and required scopes.

### NuGet authentication (required for the BFF)

The BFF references `Spydersoft.Platform.Hosting` from a GitHub Packages feed and needs a GitHub PAT with `read:packages` scope. See [docs/development.md#nuget-sources](docs/development.md#nuget-sources). GitHub Packages requires auth even for reading public packages.

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

- Subject under 70 characters, imperative mood ("Add MPG-by-vehicle chart", not "Added MPG chart")
- Body explains the *why* when it isn't obvious from the diff
- One logical change per commit; squash WIP commits before pushing

## Pull requests

Open the PR against `main`. The CI pipeline (Azure DevOps) will:

1. Build the React UI (`yarn build` in `src/pitstop-ui`)
2. Run UI tests via Vitest with the JUnit + coverage reporters
3. Restore and publish the BFF from the GitHub Packages feed
4. Run SonarCloud analysis on both the BFF and the UI

PRs need a green pipeline before merge. Container image builds and Helm config updates only happen on merge to `main`, not on PRs.

A good PR description:

- States what changed and why in 1–3 bullets
- Calls out anything reviewer-worthy (new dependency, breaking UX, accessibility concern)
- For UI changes, includes a screenshot or short clip if visual behavior changed
- Includes a test plan if behavior changed

## Code style

| Concern                  | Tool                                          | Enforced when                |
| ------------------------ | --------------------------------------------- | ---------------------------- |
| TypeScript / React       | ESLint + `eslint-plugin-react-hooks`          | pre-commit on staged files   |
| Prettier formatting      | Prettier                                      | pre-commit                   |
| JSON / YAML / Markdown   | Prettier                                      | pre-commit                   |
| Line endings             | LF (see `.editorconfig`)                      | editor                       |
| UI tests                 | Vitest                                        | CI                           |

If you bypass a hook (`--no-verify`) you'll find out in CI. Don't.

### React conventions

- Function components with hooks. No class components for new code.
- Components live in `src/pitstop-ui/src/components/<Feature>/`. One feature per folder; the public component is the folder name (`Vehicles/index.tsx` or `Vehicles/Vehicles.tsx`).
- State lives in Redux Toolkit slices under `src/store/`. Local component state is fine for UI-only concerns (form fields, modal open/closed).
- Styling is Tailwind utility classes + PrimeReact components. Don't introduce a third styling system.
- Don't import from `src/api/generated/` directly in components — it's the raw `@hey-api/openapi-ts` output. Wrap calls in a slice or hook.

## Tests

UI tests use Vitest with `@testing-library/react`:

```bash
cd src/pitstop-ui
yarn test
```

New components with non-trivial logic (state transitions, conditional rendering on data shape, derived values) should land with tests. Pure presentation components don't need tests.

There are no BFF tests today. If you add logic to the BFF (custom claims transformer, new controller, request transform), please add tests.

## Schema and API client

The TypeScript API client in `src/pitstop-ui/src/api/generated/` is generated from `pitstop-api`'s OpenAPI spec.

**If your change depends on an API change:**

1. Land the API change in [pitstop-api](https://github.com/spydersoft-consulting/pitstop-api) first.
2. Run pitstop-api locally.
3. Regenerate the client: `cd src/pitstop-ui && yarn api:update`.
4. Commit the regenerated `pitstop.json` and `src/api/generated/` along with your UI change.

Don't hand-edit anything in `src/api/generated/`. It's overwritten on every regen.

## Reporting bugs

Open an issue with:

- What you did (which page, what you clicked, what you typed)
- What you expected
- What happened instead (screenshot or browser console output is gold)
- Environment: browser + OS, local dev or hosted instance

Security-sensitive issues: please email the maintainer (see the repo's GitHub profile) rather than opening a public issue.

## License

By contributing, you agree your contributions will be licensed under the [MIT License](LICENSE) covering this repository.
