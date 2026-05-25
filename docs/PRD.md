# secretshape PRD

Status: in-progress

## Summary

`secretshape` describes the shape of required secrets without exposing their values. It validates `.env.example`, CI variable docs, and local config manifests so projects can document what they need without leaking credentials.

## Problem

Many repos either omit required env vars or keep stale `.env.example` files. Agents also need to know which secrets exist, which are optional, and what format they should have, but the values must stay private.

## V1 Goals

- Parse a `secretshape.yaml` schema.
- Validate `.env.example` and optional `.env.local` shape without printing secret values.
- Check required, optional, pattern, enum, and description fields.
- Emit Markdown docs from the schema.
- Provide JSON output for CI and agent workflows.
- Include fixtures for passing, missing, stale, and invalid config.

## Non-Goals

- No secret storage or vault integration.
- No uploading variable names or values.
- No automatic mutation of real `.env` files.

## CLI

```bash
secretshape init
secretshape check --schema secretshape.yaml --example .env.example
secretshape docs --schema secretshape.yaml --out docs/secrets.md
```

## Safety

`secretshape` must never print values from real env files, only names, requirement status, and validation categories.

## Inspiration

Inspired by config schemas, twelve-factor app hygiene, and agent-friendly setup docs that need to discuss secrets without revealing them.
