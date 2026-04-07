#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

DATE_TAG="${DATE_TAG:-$(date +%F)}"
DELAY_MS="${DELAY_MS:-1000}"
MAX_PASSES="${MAX_PASSES:-6}"
RETRY_POLICY="${RETRY_POLICY:-api-only}"
PRIME_MAX_ATTEMPTS="${PRIME_MAX_ATTEMPTS:-5}"
PRIME_RETRY_BASE_MS="${PRIME_RETRY_BASE_MS:-3000}"
PRIME_REQUEST_TIMEOUT_MS="${PRIME_REQUEST_TIMEOUT_MS:-60000}"

export PRIME_MODEL="${PRIME_MODEL:-glm-5.1}"
export PRIME_INFERENCE_URL="${PRIME_INFERENCE_URL:-https://api.z.ai/api/coding/paas/v4}"
export PRIME_API_KEY_VAR="${PRIME_API_KEY_VAR:-ZAI_API_KEY}"
export PRIME_MAX_ATTEMPTS
export PRIME_RETRY_BASE_MS
export PRIME_REQUEST_TIMEOUT_MS

if [[ -z "${ZAI_API_KEY:-}" ]]; then
  echo "ZAI_API_KEY is required in the environment." >&2
  exit 1
fi

seed_gold_dir() {
  local seeded_dir="artifacts/local-runs/adapter-datasets/glm51-zai-gold-tools-15x10-${DATE_TAG}"
  local partial_dir="artifacts/local-runs/adapter-datasets/glm51-zai-gold-tools-15x1-${DATE_TAG}"

  if [[ -d "$seeded_dir" ]]; then
    return 0
  fi

  if [[ -d "$partial_dir" ]]; then
    cp -R "$partial_dir" "$seeded_dir"
    echo "Seeded $seeded_dir from $partial_dir"
    return 0
  fi

  mkdir -p "$seeded_dir"
}

failed_samples() {
  local summary_path="$1"
  if [[ ! -f "$summary_path" ]]; then
    echo "-1"
    return 0
  fi

  node -e 'const fs=require("fs"); const p=process.argv[1]; const data=JSON.parse(fs.readFileSync(p,"utf8")); process.stdout.write(String(data.failed_samples ?? -1));' "$summary_path"
}

run_suite() {
  local case_source="$1"
  local rollouts="$2"
  local output_name="$3"
  local previous_failed="-1"

  for pass in $(seq 1 "$MAX_PASSES"); do
    echo
    echo "=== ${output_name}: pass ${pass}/${MAX_PASSES} (retry_policy=${RETRY_POLICY}) ==="
    npm run run:adapter-dataset -- \
      --command "node packages/environment/examples/prime_protocol_adapter.mjs" \
      --case-source "$case_source" \
      --mode tools \
      --rollouts-per-example "$rollouts" \
      --output-name "$output_name" \
      --model-name "glm-5.1" \
      --resume \
      --retry-failed \
      --retry-policy "$RETRY_POLICY" \
      --delay-ms "$DELAY_MS"

    local summary_path="artifacts/local-runs/adapter-datasets/${output_name}/summary.json"
    local current_failed
    current_failed="$(failed_samples "$summary_path")"
    echo "Failed samples after pass ${pass}: ${current_failed}"

    if [[ "$current_failed" == "0" ]]; then
      break
    fi

    if [[ "$current_failed" == "$previous_failed" ]]; then
      echo "Failed sample count stabilized at ${current_failed}; moving on."
      break
    fi

    previous_failed="$current_failed"
  done
}

main() {
  mkdir -p artifacts/local-runs/logs
  seed_gold_dir

  run_suite "gold" "10" "glm51-zai-gold-tools-15x10-${DATE_TAG}"
  run_suite "synthetic" "5" "glm51-zai-synthetic-tools-21x5-${DATE_TAG}"
}

main "$@"
