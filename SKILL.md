# SecretShape Agent Skill

Use this skill when an agent needs to document, validate, or review required
environment variables without exposing real secret values.

## Required Inputs

- A `secretshape.yaml` file with a top-level `secrets` map.
- A `.env.example` file or equivalent public example file.
- An optional local env file when checking that the current workspace has the
  required names and value shapes.

## Tools

- Use `node src/cli.js` from a checkout.
- Use `secretshape` or `npx secretshape` after package installation.
- No network access is required for checks or docs generation.

## Workflow

1. Create or inspect the schema:
   `secretshape init` or open the existing `secretshape.yaml`.
2. Validate public documentation:
   `secretshape check --schema secretshape.yaml --example .env.example`.
3. Emit machine-readable evidence for CI or release notes:
   `secretshape check --schema secretshape.yaml --example .env.example --json`.
4. Use `--fail-on-warning` when stale documented variables should block a
   release candidate.
5. Generate shareable docs:
   `secretshape docs --schema secretshape.yaml --out docs/secrets.md`.

## Side-Effect Boundaries

- `check` is read-only.
- `docs` writes only the explicit `--out` path.
- `init` writes `secretshape.yaml` and refuses to overwrite an existing file.
- Secret values from local env files are never printed in issues or summaries.

## Approval Requirements

Ask before reading a real `.env.local` or publishing generated secret docs.
Never paste local secret values into issues, PR bodies, or chat.

## Validation

```bash
npm run build
npm test
npm run smoke
npm run package:smoke
npm run release:check
```

## Examples

```bash
secretshape check --schema examples/basic/secretshape.yaml --example examples/basic/.env.example
secretshape check --schema secretshape.yaml --example .env.example --json --fail-on-warning
secretshape docs --schema secretshape.yaml --out docs/secrets.md
```
