# Social hooks for secretshape

## Hook pack

1. Your `.env.example` can drift from what the app actually expects. secretshape
   checks the names and shapes without printing real secrets.
2. Instead of asking contributors to paste token values into a review, document
   the required shapes and verify placeholders locally.
3. A tiny `secretshape.yaml` can turn secret onboarding into a repeatable
   checklist: required names, allowed enum values, and safe generated docs.
4. For CI handoffs, `secretshape check --json` gives reviewers a machine-readable
   summary of missing, stale, or invalid secret docs.
5. The demo fixture shows GitHub and OpenAI token shapes with fake placeholder
   values, then generates a Markdown table for onboarding docs.

## Grounded demo commands

```sh
bash demo/team-onboarding-secret-shapes.sh
node src/cli.js check --schema examples/basic/secretshape.yaml --example examples/basic/.env.example
node src/cli.js docs --schema examples/team-onboarding/secretshape.yaml --out /tmp/secretshape-team-onboarding.md
```

## Boundaries

- secretshape validates documentation and local example files; it is not a
  secret manager.
- Review generated docs before publishing.
- Keep placeholders fake even when they match a real secret's expected shape.
