import { stdin, stdout, stderr, env } from "node:process";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "issue_type",
    "root_cause",
    "customer_impact",
    "contractual_applicability",
    "discrepancy_detected",
    "recommended_owner",
    "recommended_action",
    "needs_human_review",
    "confidence",
    "customer_note",
    "internal_note",
  ],
  properties: {
    issue_type: {
      type: "string",
      enum: [
        "pricing_config_mismatch",
        "metering_discrepancy",
        "incident_impact_review",
        "customer_caused_issue",
        "policy_applicability_review",
        "ambiguous_case",
      ],
    },
    root_cause: {
      type: "string",
      enum: [
        "capacity_shortfall",
        "scheduler_failure",
        "gpu_node_failure",
        "usage_metering_error",
        "billing_config_out_of_sync_with_crm",
        "customer_misconfiguration",
        "scheduled_maintenance",
        "unknown_root_cause",
      ],
    },
    customer_impact: {
      type: "string",
      enum: [
        "no_customer_impact",
        "outage",
        "degraded_performance",
        "delayed_job_start",
        "job_failure",
        "retry_storm",
        "usage_visibility_gap",
        "invoice_confusion",
      ],
    },
    contractual_applicability: {
      type: "string",
      enum: [
        "not_an_sla_case",
        "sla_breach",
        "no_sla_breach",
        "sla_excluded_scheduled_maintenance",
        "sla_excluded_customer_caused",
        "credit_due",
        "no_credit_due",
        "invoice_adjustment_due",
        "goodwill_credit_optional",
      ],
    },
    discrepancy_detected: { type: "boolean" },
    recommended_owner: {
      type: "string",
      enum: [
        "revops_owner",
        "finance_owner",
        "engineering_owner",
        "shared_revops_finance",
        "shared_revops_engineering",
        "human_review_required",
      ],
    },
    recommended_action: {
      type: "string",
      enum: [
        "send_explanation_only",
        "hold_for_revops_review",
        "hold_for_finance_review",
        "hold_for_engineering_review",
        "consider_goodwill_credit",
        "no_action_required",
      ],
    },
    needs_human_review: { type: "boolean" },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
    },
    customer_note: { type: "string" },
    internal_note: { type: "string" },
  },
};

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    stdin.setEncoding("utf8");
    stdin.on("data", (chunk) => {
      data += chunk;
    });
    stdin.on("end", () => resolve(data));
    stdin.on("error", reject);
  });
}

function buildMessages(request) {
  const messages = [
    {
      role: "system",
      content: request.prompt_bundle.system_prompt,
    },
  ];

  const userSections = [request.prompt_bundle.user_prompt];

  if (request.prompt_bundle.tool_instructions) {
    userSections.push(request.prompt_bundle.tool_instructions);
  }

  if (request.mode === "tools" && Array.isArray(request.prefetched_tool_calls)) {
    userSections.push(
      [
        "Prefetched tool results:",
        JSON.stringify(request.prefetched_tool_calls, null, 2),
        "Use the tool results above as the authoritative internal evidence for this case.",
      ].join("\n"),
    );
  } else {
    userSections.push(
      [
        "Case packet:",
        JSON.stringify(request.case_packet, null, 2),
      ].join("\n"),
    );
  }

  messages.push({
    role: "user",
    content: userSections.join("\n\n"),
  });

  return messages;
}

function extractTextContent(content) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object") {
          if (typeof item.text === "string") {
            return item.text;
          }

          if (item.type === "text" && typeof item.content === "string") {
            return item.content;
          }
        }

        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

function extractFirstJsonObject(raw) {
  const text = raw.trim();
  const start = text.indexOf("{");
  if (start < 0) {
    throw new Error("No JSON object found in model response.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  throw new Error("Unterminated JSON object in model response.");
}

async function callOpenRouter(request) {
  const apiKey = env.OPENROUTER_API_KEY;
  const model = env.OPENROUTER_MODEL;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required.");
  }

  if (!model) {
    throw new Error("OPENROUTER_MODEL is required.");
  }

  const temperature = env.OPENROUTER_TEMPERATURE ?? "0";
  const maxTokens = env.OPENROUTER_MAX_TOKENS;
  const providerOrder = (env.OPENROUTER_PROVIDER_ORDER ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const providerOnly = (env.OPENROUTER_PROVIDER_ONLY ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowFallbacks =
    env.OPENROUTER_ALLOW_FALLBACKS === undefined
      ? undefined
      : env.OPENROUTER_ALLOW_FALLBACKS === "true";

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://local.infraresolutionbench",
      "X-Title": "InfraResolutionBench",
    },
    body: JSON.stringify({
      model,
      messages: buildMessages(request),
      ...(temperature ? { temperature: Number(temperature) } : {}),
      ...(maxTokens ? { max_tokens: Number(maxTokens) } : {}),
      ...(providerOrder.length > 0 || providerOnly.length > 0 || allowFallbacks !== undefined
        ? {
            provider: {
              ...(providerOrder.length > 0 ? { order: providerOrder } : {}),
              ...(providerOnly.length > 0 ? { only: providerOnly } : {}),
              ...(allowFallbacks !== undefined ? { allow_fallbacks: allowFallbacks } : {}),
              require_parameters: true,
            },
          }
        : {}),
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "infraresolutionbench_model_output",
          strict: true,
          schema: OUTPUT_SCHEMA,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}): ${errorBody}`);
  }

  const parsed = await response.json();
  const choice = parsed?.choices?.[0];
  const text = extractTextContent(choice?.message?.content ?? "");
  const jsonText = extractFirstJsonObject(text);

  return {
    parsedResponse: parsed,
    modelOutput: JSON.parse(jsonText),
  };
}

try {
  const raw = await readStdin();
  const request = JSON.parse(raw);
  const { parsedResponse, modelOutput } = await callOpenRouter(request);

  stdout.write(
    JSON.stringify({
      model_name: env.OPENROUTER_MODEL,
      model_output: modelOutput,
      used_tools:
        request.mode === "tools"
          ? (request.prefetched_tool_calls ?? []).map((call) => call.tool)
          : [],
      adapter_metadata: {
        provider: "openrouter-direct",
        mode: request.mode,
        response_id: parsedResponse?.id ?? null,
        usage: parsedResponse?.usage ?? null,
      },
    }),
  );
} catch (error) {
  stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
}
