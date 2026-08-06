# secretshape

Describe the shape of required secrets without exposing their values.

`secretshape` validates project secret documentation such as `.env.example`
against a small `secretshape.yaml` schema. It reports missing, stale, and
invalid entries by name and category only.

## Status

This repository is early-stage. The V1 CLI supports schema initialization,
shape checks, Markdown documentation generation, and JSON output for CI.

## Install from a checkout

```sh
git clone https://github.com/rogerchappel/secretshape.git
cd secretshape
npm install
npm test
```

## Use

Create a schema:

```sh
npx secretshape init
```

Example `secretshape.yaml`:

```yaml
secrets:
  API_KEY:
    required: true
    pattern: "^sk_[A-Za-z0-9]+$"
    description: API token used by the app
  NODE_ENV:
    required: false
    enum: [development, test, production]
    description: Runtime environment
```

The top level accepts only `secrets`. Each secret accepts only `required`,
`pattern`, `enum`, and `description`; unsupported keys are rejected with their
schema path and line number so misspellings cannot silently change validation.

Validate `.env.example`:

```sh
npx secretshape check --schema secretshape.yaml --example .env.example
```

Each `pattern` must be valid JavaScript regular-expression syntax. SecretShape
validates and compiles patterns when it loads the schema, so a malformed pattern
reports the schema path and secret name before any environment values are
checked.

Keys must be unique within each schema map: duplicate secret names and duplicate
fields such as `required` are rejected with the schema path, key path, and line
numbers. Variables must likewise appear only once in each example or local env
file. `check` reports both duplicate-definition line numbers, exits non-zero in
human and JSON modes, and never includes the associated values in its output.

Validate optional local config shape without printing values:

```sh
npx secretshape check --schema secretshape.yaml --example .env.example --local .env.local
```

Emit JSON for automation:

```sh
npx secretshape check --schema secretshape.yaml --example .env.example --json
```

Fail CI when stale documented names are present, even if required secrets are
otherwise valid:

```sh
npx secretshape check --schema secretshape.yaml --example .env.example --fail-on-warning
```

Generate Markdown docs:

```sh
npx secretshape docs --schema secretshape.yaml --out docs/secrets.md
```

`check` accepts `--schema <path>`, `--example <path>`, `--local <path>`,
`--json`, and `--fail-on-warning`. `docs` accepts `--schema <path>` and
`--out <path>`. Unknown options, options for another command, and missing option
values exit non-zero without running validation or documentation generation.

Try the committed fixture without writing generated files into your project:

```sh
node src/cli.js check \
  --schema examples/basic/secretshape.yaml \
  --example examples/basic/.env.example
```

## Demo walkthrough

Run the fixture-backed demo to validate the example contract, emit JSON
evidence, and generate Markdown docs:

```sh
bash demo/validate-secret-docs.sh
```

For a CI-shaped variant that writes evidence to a temporary artifact directory:

```sh
bash demo/ci-secretshape-gate.sh
```

See
[`docs/tutorials/secret-docs-without-values.md`](docs/tutorials/secret-docs-without-values.md)
for the review flow and
[`docs/promo/social-hooks.md`](docs/promo/social-hooks.md) for promotion-ready
post drafts grounded in the checked-in fixture. A short screencast outline lives
in
[`docs/promo/ci-secretshape-gate-video-brief.md`](docs/promo/ci-secretshape-gate-video-brief.md).

Additional onboarding assets from this sweep:

- [Document team onboarding secrets](docs/tutorials/team-onboarding-secret-shapes.md)
  shows a fixture for GitHub and OpenAI token shapes plus generated Markdown
  docs.
- `bash demo/team-onboarding-secret-shapes.sh` verifies the onboarding fixture
  and writes reviewable JSON and Markdown outputs under `/tmp`.

## Package Contents

The npm package allowlist includes the runtime source, smoke scripts, public
support docs, and `examples/basic` fixture. `npm run package:smoke` packs and
installs the tarball in a fresh temporary project, then exercises the installed
CLI's check, init, and docs commands without publishing.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution expectations. Changes
should be small, reviewable, and verified before review.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance. `secretshape`
checks names, documentation, and shape constraints. It does not print secret
values, but review schemas and generated docs before sharing them publicly.

## License

MIT

## Verification

Run the release-readiness checks before publishing or cutting a PR:

```bash
npm ci
npm run build
npm test
npm run smoke
npm run package:smoke
npm run release:check
```

The committed `package-lock.json` is the release dependency source of truth.
Keep it in sync with `package.json`; CI, release dry runs, and tagged releases
all use `npm ci` so lockfile drift fails before publishing.

`scripts/validate.sh` runs the same package scripts and also runs
`agent-qc ready` when that optional tool is installed. Missing `agent-qc` is
treated as a skip, not a failure.

## Limitations

secretshape is a local-first helper for preparing reviewable evidence. It does not replace human review, live system validation, or project-specific policy checks, and generated output should be inspected before use in release or operational decisions.
