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

Hosted Prime evaluation is confirmed working with the current published environment version.

Synthetic selection note:

- the Prime environment now interleaves generated families before applying `limit`
- this avoids capped synthetic runs accidentally collapsing onto one family due to filename ordering
- a balanced `limit=21` hosted synthetic sweep covers 3 examples from each of the 7 current families

## Current hosted benchmark snapshot

- Gold, packet, `10 x 3`: `tq7gtxsch95jfrzhgqfblo70`, avg reward `0.486`
- Gold, tools, `10 x 3`: `ry7d1097ykevw933f8dw614g`, avg reward `0.488`
- Synthetic, packet, balanced `21 x 3`, environment `0.1.9`: `q0gnlmqrm83fnnh5kkc11tvw`, avg reward `0.837`
- Synthetic, tools, balanced `21 x 3`, environment `0.1.9`: `rl2anuwijpfnvc4wizih6xmb`, avg reward `0.863`
- Targeted, `metering_discrepancy`, packet, `3 x 3`, environment `0.1.7`: `flpqu2suc04c9jsg9h4zg9nr`, avg reward `0.844`
- Targeted, `metering_discrepancy`, tools, `3 x 3`, environment `0.1.7`: `uvy4oxlet4vvzggnjm79zars`, avg reward `0.864`
- Targeted, `clean_covered_outage`, packet, `3 x 3`, environment `0.1.7`: `ks44c5uy6ilqjg4tt4ns0wxz`, avg reward `0.816`
- Targeted, `clean_covered_outage`, tools, `3 x 3`, environment `0.1.7`: `vlvt0yjmskpeqy0fape01civ`, avg reward `0.853`
- Targeted, `customer_caused_failure`, packet, `3 x 3`, environment `0.1.9`: `fkv31ghzysud7bpbo8twzr9q`, avg reward `0.868`
- Targeted, `customer_caused_failure`, tools, `3 x 3`, environment `0.1.9`: `w84ptwplbom3b5ozhhjr7sco`, avg reward `0.972`

Current read:

- live tool calling is working end to end in hosted Prime evals
- tool mode is effectively tied with packet mode on the gold set for `openai/gpt-4.1-nano` once rollouts are matched
- tighter enum guidance, tool-checklist instructions, and note-writing guidance in environment `0.1.9` materially improved both packet and tools on the balanced synthetic sweep
- the balanced synthetic packet-vs-tools gap is now about `+0.027`, reversing the earlier tool deficit
- targeted prompt updates across environments `0.1.7` through `0.1.9` turned `metering_discrepancy`, `clean_covered_outage`, and `customer_caused_failure` into tool wins on matched reruns
- the `customer_caused_failure` improvement was driven more by better note phrasing and required-content behavior than by reclassifying the structured fields

## First sweep snapshot

The first ranked Prime model sweep is now imported against the balanced synthetic `tools` benchmark (`21 x 3`, environment `0.1.10`).

Current completed leaders:

- `anthropic/claude-opus-4.6`: `0.931` via `xjfyhbzhqv39yd2fcaqktydv`
- `openai/gpt-5.1`: `0.922` via `hb585vdhdbg5gkd5d739tz4s`
- `anthropic/claude-sonnet-4.6`: `0.922` via `dhbnwlha48i3tfx64muvpwwz`
- `anthropic/claude-opus-4.5`: `0.921` via `wdd9idfxqos5qdzb32jnru5r`
- `openai/gpt-5.3-codex`: `0.920` via `hzzjdp8fy7fcy2xj6zn9i5ni`
- `openai/gpt-5.4`: `0.913` via `onkyl5t727w1olpzkj4mcdif`
- `google/gemini-3.1-pro-preview`: `0.910` via `m3embysugwvoah7rbcs0x63g`

Lower-performing completed runs so far:

- `openai/gpt-5`: `0.902`
- `openai/gpt-5.1-codex`: `0.902`
- `openai/gpt-5-codex`: `0.882`
- `openai/gpt-5.2`: `0.877`
- `google/gemini-3-flash-preview`: `0.831`
- `z-ai/glm-5`: `0.764`
- `moonshotai/kimi-k2.5`: `0.446`

Provider-format note from the same sweep:

- environment `0.1.10` now extracts the first valid JSON object from wrapped model output, which recovered Anthropic responses that arrived as reasoning text plus fenced JSON.
- `google/gemini-3-pro-preview` failed during hosted startup and should be retried separately.

## Higher-sample hosted leaderboard

The next hosted pass increased sample counts without changing the benchmark contract:

- gold tools: `10 x 10 = 100` samples per model
- synthetic tools: `21 x 5 = 105` samples per model
- models with both slices completed therefore now have `205` hosted samples represented in the leaderboard row

Current combined leaderboard rows use `0.6 * gold + 0.4 * synthetic`:

- `anthropic/claude-opus-4.6`: overall `0.924`, gold `0.921`, synthetic `0.928`
- `anthropic/claude-opus-4.5`: overall `0.917`, gold `0.911`, synthetic `0.925`
- `anthropic/claude-sonnet-4.6`: overall `0.916`, gold `0.911`, synthetic `0.922`
- `openai/gpt-5.1`: overall `0.916`, gold `0.917`, synthetic `0.914`
- `openai/gpt-5.3-codex`: overall `0.915`, gold `0.915`, synthetic `0.915`

Reference summaries:

- `artifacts/model-sweeps/gold-tools-top5-followup-100plus-summary.json`
- `artifacts/model-sweeps/synthetic-tools-top15-100plus-summary.json`

## Published environment

- Hub slug: `kariminal/infraresolutionbench`
- Environment module: [`environments/infraresolutionbench`](/Users/karimyahia/Documents/test/wii2/primeintellect/environments/infraresolutionbench)

The Prime environment wraps the same benchmark contract used locally:

- `case_source`: `gold` or `all`
- `case_source`: `synthetic` is also supported for generated-only evaluation
- `prompt_mode`: `packet` or `tools`
- deterministic exact, consistency, and rubric scoring
- single-turn packet evaluation plus live tool execution through `verifiers`

## Follow-up sweep planning

Once a hosted sweep summary has been imported, the repo can automatically promote the strongest completed models into the next benchmark slice.

Example:

```bash
npm run sweep:plan:followup -- \
  --summary artifacts/model-sweeps/aa-2026-04-05-summary.json \
  --providers prime \
  --top-n 5 \
  --target-case-source gold \
  --target-prompt-mode tools \
  --num-examples 10 \
  --rollouts-per-example 3 \
  --limit 10 \
  --output artifacts/model-sweeps/gold-tools-top5-followup.json
```

That output can be fed directly into the existing sweep runner once balance is available again.

If a promoted slice fails or partially completes, the repo can also turn the summary back into a retry queue:

```bash
npm run sweep:plan:retry -- \
  --summary artifacts/model-sweeps/gold-tools-top5-followup-summary.json \
  --providers prime \
  --statuses FAILED \
  --output artifacts/model-sweeps/gold-tools-top5-retry.json
```

That keeps the rerun set aligned with the actual failed rows instead of rebuilding it by hand.

## Hosted eval command

```bash
prime eval run kariminal/infraresolutionbench --env-args '{"case_source":"gold","prompt_mode":"packet","limit":"1"}' --provider prime --model openai/gpt-4.1-nano --num-examples 1 --rollouts-per-example 1 --abbreviated-summary --hosted --follow
```

Hosted tool-mode smoke test:

```bash
prime eval run kariminal/infraresolutionbench --env-args '{"case_source":"gold","prompt_mode":"tools","limit":"1"}' --provider prime --model openai/gpt-4.1-nano --num-examples 1 --rollouts-per-example 1 --abbreviated-summary --hosted --follow
```

Import a completed hosted eval into local artifacts for the web app:

```bash
npm run prime:eval:import -- --eval-id <prime-eval-id>
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

For non-Prime model coverage later, see [`docs/openrouter-setup.md`](/Users/karimyahia/Documents/test/wii2/primeintellect/docs/openrouter-setup.md).

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
