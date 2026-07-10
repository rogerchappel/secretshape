# Video Brief: CI SecretShape Gate

## Hook

"Your `.env.example` can be reviewed without exposing a single secret value."

## Demo beats

1. Show `examples/basic/secretshape.yaml` with two documented requirements:
   `API_KEY` and `NODE_ENV`.
2. Show `examples/basic/.env.example` using placeholder values only.
3. Run `bash demo/ci-secretshape-gate.sh`.
4. Open the JSON report from `${TMPDIR:-/tmp}/secretshape-ci-gate` and point to
   `"ok": true`, `"schemaSecrets": 2`, and `"documentedSecrets": 2`.
5. Open the generated Markdown file and explain that docs are derived from
   schema metadata, not local secret values.

## Caption

SecretShape checks secret names and constraints so onboarding docs can stay
accurate without leaking values.

## Limitations to mention

- It validates documentation shape, not whether a live production secret works.
- Generated Markdown should still be reviewed before publishing.
