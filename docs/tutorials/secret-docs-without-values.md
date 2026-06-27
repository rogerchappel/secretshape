# Document secret requirements without exposing values

This tutorial uses `examples/basic` to show how SecretShape validates a public
`.env.example` file against a schema and generates Markdown documentation that
describes requirements by name and shape only.

## Run the demo

```sh
npm install
bash demo/validate-secret-docs.sh
```

The script writes:

- `demo/output/basic-check.json` with machine-readable validation evidence.
- `demo/output/secrets.md` with generated secret documentation.

## Files involved

- `examples/basic/secretshape.yaml` defines required secret names,
  descriptions, patterns, and enums.
- `examples/basic/.env.example` provides publishable placeholder values.
- `demo/output/secrets.md` is generated from schema metadata, not local secret
  values.

## CI usage

Use the JSON mode when a workflow needs to archive or parse the result:

```sh
node src/cli.js check \
  --schema examples/basic/secretshape.yaml \
  --example examples/basic/.env.example \
  --json
```

Use the docs command when onboarding docs should stay aligned with the schema:

```sh
node src/cli.js docs \
  --schema examples/basic/secretshape.yaml \
  --out docs/secrets.md
```

Review generated docs before publishing them, especially when schema
descriptions mention internal systems.
