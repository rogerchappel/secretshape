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

Try the committed fixture without writing generated files into your project:

```sh
node src/cli.js check \
  --schema examples/basic/secretshape.yaml \
  --example examples/basic/.env.example
```

## Package Contents

The npm package allowlist includes the runtime source, smoke script, public
support docs, and `examples/basic` fixture. Run `npm run package:smoke` before
publishing to confirm the tarball still includes the runnable CLI and example
schema.

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
npm run build
npm test
npm run smoke
npm run package:smoke
npm run release:check
```

`scripts/validate.sh` runs the same package scripts and also runs
`agent-qc ready` when that optional tool is installed. Missing `agent-qc` is
treated as a skip, not a failure.
