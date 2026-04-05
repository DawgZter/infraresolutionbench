import { readFile } from "node:fs/promises";
import { env, stdin, stdout, stderr } from "node:process";
import path from "node:path";

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

async function loadPrimeConfig() {
  const configPath = path.join(env.HOME ?? "", ".prime", "config.json");
  const raw = await readFile(configPath, "utf8");
  return JSON.parse(raw);
}

function buildMessages(request) {
  const systemInstruction = [
    request.prompt_bundle.system_prompt,
    "The benchmark tool results have already been fetched for you.",
    "Do not emit <think>, <tool_call>, XML, markdown, or any extra narration.",
    "Do not ask to call tools.",
    "Return exactly one valid JSON object matching the required schema.",
  ].join("\n\n");

  const userSections = [
    request.prompt_bundle.user_prompt,
    request.prompt_bundle.tool_instructions,
    "Prefetched tool results:",
    JSON.stringify(request.prefetched_tool_calls ?? [], null, 2),
    "Use only the evidence in the prefetched tool results above.",
    "Return only the final JSON object.",
  ].filter(Boolean);

  return [
    { role: "system", content: systemInstruction },
    { role: "user", content: userSections.join("\n\n") },
  ];
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

function stripXmlToolMarkup(text) {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, " ")
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, " ")
    .replace(/<function=[^>]+>[\s\S]*?<\/function>/gi, " ")
    .replace(/<parameter=[^>]+>[\s\S]*?<\/parameter>/gi, " ")
    .trim();
}

function extractFirstJsonObject(raw) {
  const text = stripXmlToolMarkup(raw);
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

    if (char === "\"") {
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

async function callPrime(request) {
  const config = await loadPrimeConfig();
  const apiKey = env.PRIME_API_KEY ?? config.api_key;
  const inferenceUrl = env.PRIME_INFERENCE_URL ?? config.inference_url;
  const model = env.PRIME_MODEL;
  const temperature = env.PRIME_TEMPERATURE ?? "0";
  const maxTokens = env.PRIME_MAX_TOKENS ?? "1400";

  if (!apiKey) {
    throw new Error("Prime API key is required.");
  }

  if (!inferenceUrl) {
    throw new Error("Prime inference URL is required.");
  }

  if (!model) {
    throw new Error("PRIME_MODEL is required.");
  }

  const response = await fetch(`${inferenceUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: buildMessages(request),
      temperature: Number(temperature),
      max_tokens: Number(maxTokens),
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
    throw new Error(`Prime inference request failed (${response.status}): ${errorBody}`);
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
  const { parsedResponse, modelOutput } = await callPrime(request);

  stdout.write(
    JSON.stringify({
      model_name: env.PRIME_MODEL,
      model_output: modelOutput,
      adapter_metadata: {
        provider: "prime-direct",
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
