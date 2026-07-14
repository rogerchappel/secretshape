# Document team onboarding secrets with secretshape

This recipe shows a small onboarding fixture for a project that needs a GitHub
token, an OpenAI API key, and a runtime environment label. secretshape checks
names and value shapes without printing real secret values.

## Fixture files

The example lives under `examples/team-onboarding/`:

- `secretshape.yaml` describes required names, patterns, and descriptions.
- `.env.example` contains placeholder values that match the documented shapes.

## Check the example

Run the shape check from the repository root:

```sh
node src/cli.js check \
  --schema examples/team-onboarding/secretshape.yaml \
  --example examples/team-onboarding/.env.example
```

For CI or release handoff evidence, emit JSON:

```sh
node src/cli.js check \
  --schema examples/team-onboarding/secretshape.yaml \
  --example examples/team-onboarding/.env.example \
  --json > /tmp/secretshape-team-onboarding-check.json
```

## Generate docs

Generate a Markdown table for reviewers or contributors:

```sh
node src/cli.js docs \
  --schema examples/team-onboarding/secretshape.yaml \
  --out /tmp/secretshape-team-onboarding.md
```

The generated docs list names, required status, shapes, and descriptions. They
do not contain real secret values.

## Review checklist

- Keep `.env.example` placeholders fake but shape-valid.
- Review generated docs before publishing them.
- Add project-specific constraints for any secret class that has a stricter
  format than the generic examples here.
