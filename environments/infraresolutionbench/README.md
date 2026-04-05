# InfraResolutionBench

Prime `verifiers` environment module for InfraResolutionBench in this repo.

## What it does

- loads the benchmark dataset directly from this repository
- packages gold and synthetic case JSON files inside the environment wheel for Hub and hosted execution
- builds Prime-compatible prompts from the existing benchmark contract
- scores outputs with deterministic exact, consistency, and rubric logic
- returns a single composite reward weighted toward exact correctness: `0.7 exact / 0.2 consistency / 0.1 rubric`

## Supported environment arguments

- `case_source="gold" | "synthetic" | "all"`
- `prompt_mode="packet" | "tools"`
- `limit=<int | None>`

## Current prompt modes

- `packet`
  Sends the full case packet directly in the prompt.
- `tools`
  Uses live read-only tool calling through `vf.ToolEnv`. The model receives the case ID in the prompt and can call record-access tools until it is ready to return the final JSON answer.

## Local setup

Install the Prime CLI and log in:

```bash
uv tool install prime
prime login
```

If you prefer API-key auth:

```bash
prime config set-api-key
prime config set-team-id  # optional, only if you want team-scoped access
```

Install the environment from this repo:

```bash
prime env install infraresolutionbench -p ./environments
```

Run a local eval:

```bash
prime eval run infraresolutionbench -m gpt-5-nano
```

Run a packet-mode eval on only the handwritten seed set:

```bash
prime eval run infraresolutionbench -m gpt-5-nano --env-args '{"case_source":"gold","prompt_mode":"packet","limit":15}'
```

Publish to the Environments Hub:

```bash
prime env push infraresolutionbench -p ./environments
```

## Required environment variables

This environment does not require any extra service keys of its own for scoring.

For Prime account access and hosted evaluation you still need Prime authentication through:

- `prime login`, or
- `PRIME_API_KEY` / `prime config set-api-key`

If you use a team workspace, also set `PRIME_TEAM_ID` or run `prime config set-team-id`.
