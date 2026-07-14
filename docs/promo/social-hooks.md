# SecretShape social hooks

## Short posts

1. Secret docs should explain names and constraints, not leak values.
   SecretShape validates `.env.example` against a small schema and can generate
   Markdown docs from that schema.

2. A public `.env.example` is easier to trust when required keys, enum values,
   and patterns are checked in CI. SecretShape keeps that check local and
   scriptable.

3. Onboarding docs drift when secret requirements live only in prose.
   SecretShape turns those requirements into a schema, a validation check, and
   generated docs.

4. Your `.env.example` can drift from what the app actually expects. SecretShape
   checks the names and shapes without printing real secrets.

5. For CI handoffs, `secretshape check --json` gives reviewers a machine-readable
   summary of missing, stale, or invalid secret docs.

## Grounded demo commands

```sh
bash demo/validate-secret-docs.sh
bash demo/team-onboarding-secret-shapes.sh
node src/cli.js check --schema examples/basic/secretshape.yaml --example examples/basic/.env.example
node src/cli.js docs --schema examples/team-onboarding/secretshape.yaml --out /tmp/secretshape-team-onboarding.md
```

## Demo angle

Run `bash demo/validate-secret-docs.sh` to validate the committed basic fixture
and generate a publishable Markdown secret reference under `demo/output/`.

## Boundaries

- secretshape validates documentation and local example files; it is not a
  secret manager.
- Review generated docs before publishing.
- Keep placeholders fake even when they match a real secret's expected shape.
