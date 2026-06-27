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

## Demo angle

Run `bash demo/validate-secret-docs.sh` to validate the committed basic fixture
and generate a publishable Markdown secret reference under `demo/output/`.
