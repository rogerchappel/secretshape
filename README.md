# secretshape

Describe the shape of required secrets without exposing their values.

`secretshape` validates project secret documentation such as `.env.example`
against a small `secretshape.yaml` schema. It reports missing, stale, and
invalid entries by name and category only.

## Status

This repository is early-stage. The V1 CLI supports schema initialization,
shape checks, Markdown documentation generation, and JSON output for CI.

## Install

```sh
npm install
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

Validate `.env.example`:

```sh
npx secretshape check --schema secretshape.yaml --example .env.example
```

Validate optional local config shape without printing values:

```sh
npx secretshape check --schema secretshape.yaml --example .env.example --local .env.local
```

Emit JSON for automation:

```sh
npx secretshape check --schema secretshape.yaml --example .env.example --json
```

Generate Markdown docs:

```sh
npx secretshape docs --schema secretshape.yaml --out docs/secrets.md
```

## Verify

Run the local validation script before opening a pull request:

```sh
bash scripts/validate.sh
```

`scripts/validate.sh` runs the repository's standard local checks when they are defined and will also run `agent-qc ready` when `agent-qc` is installed. Missing `agent-qc` is treated as a skip, not a failure.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution expectations. Changes
should be small, reviewable, and verified before review.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance. Replace
the default security policy before publishing the generated repository.

These links assume this README has been copied to the generated repository root.

## License

MIT
