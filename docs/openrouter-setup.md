# OpenRouter Setup

## Goal

Prepare this repo so future benchmark sweeps can run models that are available on OpenRouter but not directly through Prime.

## Create and store your key

Set your OpenRouter API key in the shell:

```bash
export OPENROUTER_API_KEY="your_key_here"
```

Persist it for future `zsh` shells:

```bash
echo 'export OPENROUTER_API_KEY="your_key_here"' >> ~/.zshrc
source ~/.zshrc
```

## Verify the key

Quick local check:

```bash
echo $OPENROUTER_API_KEY
```

Optional API verification:

```bash
curl https://openrouter.ai/api/v1/key \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"
```

## Repo helper

This repo now includes a generic hosted-eval wrapper:

```bash
npm run eval:hosted -- \
  --provider openrouter \
  --model openai/gpt-5 \
  --case-source gold \
  --prompt-mode tools \
  --limit 10 \
  --num-examples 10 \
  --rollouts-per-example 3
```

By default, the wrapper uses hosted mode, saves results, and follows logs.
When `--provider openrouter` is selected, the wrapper now injects the working
OpenRouter route automatically:
- `--api-key-var OPENROUTER_API_KEY`
- `--api-base-url https://openrouter.ai/api/v1`

## OpenRouter-specific knobs

The Prime CLI supports OpenRouter directly when the auth variable and base URL
are explicit:

```bash
prime eval run kariminal/infraresolutionbench \
  --provider openrouter \
  --model openai/gpt-5 \
  --env-args '{"case_source":"gold","prompt_mode":"tools","limit":"10"}' \
  --num-examples 10 \
  --rollouts-per-example 3 \
  --hosted \
  --follow
```

If needed, you can still force the auth variable or base URL explicitly:

```bash
prime eval run kariminal/infraresolutionbench \
  --provider openrouter \
  --api-key-var OPENROUTER_API_KEY \
  --api-base-url https://openrouter.ai/api/v1 \
  --model openai/gpt-5 \
  --env-args '{"case_source":"gold","prompt_mode":"tools","limit":"10"}'
```

## Ranked model sweeps later

When we are ready for the multi-model run:

1. Pull the current Artificial Analysis leaderboard manually.
2. Save the ranked candidates into a manifest JSON.
3. Use the sweep planner to select:
   - top 15 Prime-available models
   - top 20 OpenRouter-available models
4. De-duplicate against models already run in `artifacts/prime-evals`.

Example:

```bash
npm run sweep:plan -- --manifest docs/model-sweep-candidates.example.json
cat artifacts/model-sweeps/latest-plan.json
```

## Notes

- Do not paste the OpenRouter API key into chat.
- If a model is available through both Prime and OpenRouter, the sweep policy is to run it once through Prime first and skip it in the OpenRouter tranche.
- We should re-check the leaderboard on the day we run, because the rankings move quickly.
