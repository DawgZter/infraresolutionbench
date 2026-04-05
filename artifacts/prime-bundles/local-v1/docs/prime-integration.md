# Prime Integration

## Goal

Keep the InfraResolutionBench contract stable while supporting both local execution and Prime-managed evaluation.

## Current status

The repo now supports real Prime execution in two layers:

- a published Prime `verifiers` environment: `kariminal/infraresolutionbench`
- a local Prime install and eval path through `environments/infraresolutionbench`
- a stable adapter protocol documented in [`docs/adapter-protocol.md`](/Users/karimyahia/Documents/test/wii2/primeintellect/docs/adapter-protocol.md)
- generic command and subprocess adapters for local external-runner experiments
- a Prime-oriented shim script for protocol-level smoke tests outside the hosted environment path

Hosted Prime evaluation is confirmed working with environment version `0.1.3`.

## Published environment

- Hub slug: `kariminal/infraresolutionbench`
- Environment module: [`environments/infraresolutionbench`](/Users/karimyahia/Documents/test/wii2/primeintellect/environments/infraresolutionbench)

The Prime environment wraps the same benchmark contract used locally:

- `case_source`: `gold` or `all`
- `prompt_mode`: `packet` or `tools`
- deterministic exact, consistency, and rubric scoring
- single-turn environment behavior through `verifiers`

## Hosted eval command

```bash
prime eval run kariminal/infraresolutionbench --env-args '{"case_source":"gold","prompt_mode":"packet","limit":"1"}' --provider prime --model openai/gpt-4.1-nano --num-examples 1 --rollouts-per-example 1 --abbreviated-summary --hosted --follow
```

## Hosted failure that was fixed

The original hosted failure showed `Examples: 0` followed by a `ZeroDivisionError`.

Root cause:

- the pushed wheel did not include the JSON benchmark data
- hosted eval successfully installed the environment, but the dataset directories were empty in the remote runtime

Fix:

- moved the Prime environment to a proper Python package layout
- vendored gold and generated case JSON into `infraresolutionbench/data`
- updated packaging metadata so those files are included in the wheel

## Prime shim and protocol tools

The current shim lives at:

- [`packages/environment/examples/prime_protocol_shim.mjs`](/Users/karimyahia/Documents/test/wii2/primeintellect/packages/environment/examples/prime_protocol_shim.mjs)

It supports two local modes:

- `PRIME_ADAPTER_MODE=local-heuristic`
  Uses the local heuristic adapter so the protocol path can be tested end to end.
- `PRIME_ADAPTER_DELEGATE_COMMAND="<command>"`
  Forwards the JSON protocol request to another command over stdin/stdout.

Optional:

- `PRIME_ADAPTER_REQUEST_DIR=/path/to/dir`
  Persists incoming request payloads for debugging.

## Why keep this shape

The hosted Prime path now works, but the adapter protocol is still useful for local debugging and future transport changes. It lets us change how execution is routed without changing:

- the benchmark prompt contract
- tool definitions
- output schema
- scoring
- artifact structure

## Local smoke-test command

```bash
PRIME_ADAPTER_MODE=local-heuristic \
npm run run:episode -- \
  --case-id gold_case_001 \
  --mode tools \
  --adapter command \
  --adapter-command "node packages/environment/examples/prime_protocol_shim.mjs" \
  --prefetch-tools all \
  --model-name prime-shim-smoke
```

## Protocol-first smoke test

Export, validate, and roundtrip a request envelope without running the full benchmark harness again:

```bash
npm run prepare:prime-request -- --case-id gold_case_001 --mode tools --prefetch-tools all
npm run validate:protocol -- --kind request --input artifacts/prime-requests/gold_case_001_tools.json
PRIME_ADAPTER_MODE=local-heuristic npm run run:protocol -- --input artifacts/prime-requests/gold_case_001_tools.json --adapter command --adapter-command "node packages/environment/examples/prime_protocol_shim.mjs"
```

## Local packaging scaffold

Export a Prime-oriented handoff bundle from the current local benchmark state:

```bash
npm run package:prime
```

The bundle lands in `artifacts/prime-bundles/local-v1` by default and includes:

- environment contract metadata
- dataset manifests
- copied gold and synthetic case files
- copied run summaries and protocol request or response artifacts
- source directory references
- copied benchmark and integration docs

## Remaining Prime-facing work

1. Add documented hosted-eval recipes for larger gold and synthetic sweeps.
2. Decide whether leaderboard views should ingest Prime evaluation IDs directly.
3. Add optional export of Prime evaluation summaries back into local artifacts.
4. Keep the adapter protocol as a sidecar for debugging and non-Prime execution paths.
