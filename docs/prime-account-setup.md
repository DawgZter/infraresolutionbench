# Prime Account Setup

## Current local status

As of April 5, 2026 on this machine:

- Prime CLI is installed
- `prime --version` returns `0.5.57`
- `prime config view` shows that no API key or logged-in user is configured yet
- `prime eval run ...` currently fails with: `No API key configured. Run prime login or prime config set-api-key.`

## Authenticate the CLI

Use either browser login or API-key login.

Browser login:

```bash
prime login
```

Headless login:

```bash
prime login --headless
```

API-key configuration:

```bash
prime config set-api-key
```

If you want team-scoped access, also run:

```bash
prime config set-team-id
```

You can confirm configuration with:

```bash
prime config view
```

## Repo helpers

This repo now includes helper scripts:

```bash
npm run prime:config:view
npm run prime:login
npm run prime:env:install
npm run prime:eval:gold -- --model gpt-5-nano
npm run prime:env:push
npm run prime:eval:gold:hosted -- --model gpt-5-nano
```

Example hosted run after login:

```bash
prime eval run infraresolutionbench \
  --env-dir-path ./environments \
  --env-args '{"case_source":"gold","prompt_mode":"packet","limit":10}' \
  --model gpt-5-nano \
  --hosted \
  --follow
```

## Secrets and API keys

For this benchmark itself:

- no extra third-party service keys are required for deterministic scoring
- Prime account authentication is still required for Prime CLI, Environments Hub, and hosted evaluation

Possible credentials you may need depending on how you run:

- `PRIME_API_KEY` or interactive `prime login`
- team ID if you want team-scoped installs or hosted runs
- model-provider keys only if you choose a non-Prime inference provider
- `OPENROUTER_API_KEY` if you later run models through OpenRouter

## OpenRouter setup

If you want this repo ready for later OpenRouter-backed evals, set the key now:

```bash
export OPENROUTER_API_KEY="your_key_here"
```

Persist it for `zsh`:

```bash
echo 'export OPENROUTER_API_KEY="your_key_here"' >> ~/.zshrc
source ~/.zshrc
```

Optional verification:

```bash
curl https://openrouter.ai/api/v1/key \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"
```

More detail lives in [`docs/openrouter-setup.md`](/Users/karimyahia/Documents/test/wii2/primeintellect/docs/openrouter-setup.md).

## Recommended order

1. `prime login`
2. `prime config view`
3. `npm run prime:env:install`
4. `npm run prime:eval:gold -- --model <model>`
5. `prime env push infraresolutionbench -p ./environments`
6. `prime eval run infraresolutionbench --hosted ...`
