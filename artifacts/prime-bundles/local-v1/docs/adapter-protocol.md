# Adapter Protocol

## Purpose

The environment package supports external model execution through a simple JSON-over-stdin/stdout protocol. This lets the benchmark run through:

- local replay adapters
- local subprocess adapters
- generic command adapters
- future hosted or Prime-managed adapters

without changing the benchmark contract, scoring, or artifact format.

## Transport

- The benchmark runner writes one JSON request object to `stdin`.
- The external adapter writes one JSON response object to `stdout`.
- Any logs or diagnostics should go to `stderr`.
- A non-zero exit code is treated as adapter failure.

## Request schema

```json
{
  "protocol_version": "v1",
  "case_id": "gold_case_001",
  "mode": "tools",
  "prompt_bundle": {
    "system_prompt": "...",
    "user_prompt": "...",
    "tool_instructions": "..."
  },
  "tool_definitions": [
    {
      "name": "get_crm_record",
      "description": "Returns the CRM and account record for the case.",
      "inputExample": "case_id=\"gold_case_001\""
    }
  ],
  "case_packet": {
    "case_id": "gold_case_001"
  },
  "prefetched_tool_calls": [
    {
      "tool": "get_crm_record",
      "arguments": {
        "case_id": "gold_case_001"
      },
      "result": {}
    }
  ]
}
```

## Response schema

```json
{
  "model_name": "external-model-name",
  "model_output": {
    "issue_type": "pricing_config_mismatch",
    "root_cause": "billing_config_out_of_sync_with_crm",
    "customer_impact": "invoice_confusion",
    "contractual_applicability": "not_an_sla_case",
    "discrepancy_detected": true,
    "recommended_owner": "shared_revops_finance",
    "recommended_action": "hold_for_revops_review",
    "needs_human_review": true,
    "confidence": "high",
    "customer_note": "...",
    "internal_note": "..."
  },
  "used_tools": [
    "get_crm_record",
    "get_billing_record"
  ],
  "adapter_metadata": {
    "example": true
  }
}
```

## Notes

- `used_tools` is optional. If omitted, the runner falls back to the prefetched tool list when appropriate.
- `model_output` must match the benchmark schema exactly.
- The external adapter does not perform scoring. It only returns a model output payload.
- The runner owns prompt construction, tool metadata, scoring, and artifact persistence.

## Local examples

Validate a prepared request payload:

```bash
npm run validate:protocol -- --kind request --input artifacts/prime-requests/gold_case_001_tools.json
```

Roundtrip a prepared request through the Prime-oriented shim and validate the response:

```bash
PRIME_ADAPTER_MODE=local-heuristic \
npm run run:protocol -- \
  --input artifacts/prime-requests/gold_case_001_tools.json \
  --adapter command \
  --adapter-command "node packages/environment/examples/prime_protocol_shim.mjs"
```

Subprocess adapter:

```bash
npm run run:episode -- --case-id gold_case_001 --mode tools --adapter subprocess --adapter-script packages/environment/examples/heuristic_subprocess_adapter.mjs --prefetch-tools all --model-name heuristic-subprocess
```

Command adapter:

```bash
npm run run:episode -- --case-id gold_case_001 --mode tools --adapter command --adapter-command "node packages/environment/examples/heuristic_subprocess_adapter.mjs" --prefetch-tools all --model-name heuristic-command
```
