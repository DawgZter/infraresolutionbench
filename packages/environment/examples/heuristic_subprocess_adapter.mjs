import { stdin, stdout, stderr } from "node:process";

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

function lower(value) {
  return value.toLowerCase();
}

function includesAny(value, candidates) {
  return candidates.some((candidate) => value.includes(candidate));
}

function findTool(callList, toolName) {
  return callList.find((call) => call.tool === toolName)?.result ?? null;
}

function buildResponse(request) {
  const casePacket = request.case_packet;
  const toolCalls = request.prefetched_tool_calls ?? [];
  const crm = findTool(toolCalls, "get_crm_record") ?? casePacket.crm_record;
  const billing = findTool(toolCalls, "get_billing_record") ?? casePacket.billing_record;
  const usage = findTool(toolCalls, "get_usage_record") ?? casePacket.usage_record;
  const incident = findTool(toolCalls, "get_incident_record") ?? casePacket.incident_record;
  const customerNote = findTool(toolCalls, "get_customer_note") ?? casePacket.customer_note;
  const policy = findTool(toolCalls, "get_policy_snippet") ?? casePacket.policy_snippet ?? "";

  const customerText = lower(typeof customerNote === "string" ? customerNote : "");
  const engineeringText = lower(incident?.engineering_summary ?? "");
  const policyText = lower(typeof policy === "string" ? policy : "");

  let output;

  if (
    crm?.contracted_commitment_gpu_hours !== billing?.configured_commitment_gpu_hours ||
    crm?.plan_name !== billing?.configured_plan_name
  ) {
    output = {
      issue_type: "pricing_config_mismatch",
      root_cause: "billing_config_out_of_sync_with_crm",
      customer_impact: "invoice_confusion",
      contractual_applicability: "not_an_sla_case",
      discrepancy_detected: true,
      recommended_owner: "shared_revops_finance",
      recommended_action: "hold_for_revops_review",
      needs_human_review: true,
      confidence: "high",
      customer_note:
        "We found a mismatch between your contracted plan and the current billing configuration, so we are routing this for RevOps review before confirming the final invoice amount.",
      internal_note:
        "Owner: shared_revops_finance. Action: hold_for_revops_review because CRM and billing configuration do not match while usage telemetry appears healthy.",
    };
  } else if (incident?.scheduled_maintenance) {
    output = {
      issue_type: "policy_applicability_review",
      root_cause: "scheduled_maintenance",
      customer_impact: "outage",
      contractual_applicability: "sla_excluded_scheduled_maintenance",
      discrepancy_detected: false,
      recommended_owner: "engineering_owner",
      recommended_action: "send_explanation_only",
      needs_human_review: false,
      confidence: "high",
      customer_note:
        "The interruption occurred during a planned maintenance window that is excluded from SLA credits under your contract, so no service credit applies.",
      internal_note:
        "Owner: engineering_owner. Action: send_explanation_only because the impact aligns with scheduled maintenance and the policy exclusion applies.",
    };
  } else if (
    includesAny(engineeringText, ["invalid", "customer-side", "checkpoint", "config manifest", "dataset schema", "container image"]) &&
    includesAny(policyText, ["excluded from sla", "customer inputs", "customer-caused"])
  ) {
    output = {
      issue_type: "customer_caused_issue",
      root_cause: "customer_misconfiguration",
      customer_impact: "job_failure",
      contractual_applicability: "sla_excluded_customer_caused",
      discrepancy_detected: false,
      recommended_owner: "engineering_owner",
      recommended_action: "send_explanation_only",
      needs_human_review: false,
      confidence: "high",
      customer_note:
        "We reviewed the runtime logs and found the failure was caused by a customer-side artifact or configuration issue rather than a platform outage.",
      internal_note:
        "Owner: engineering_owner. Action: send_explanation_only because the evidence points to customer_misconfiguration and the contract excludes customer-caused failures.",
    };
  } else if (
    usage?.meter_ingestion_status !== "healthy" ||
    includesAny(engineeringText, ["meter", "ingestion", "lagging"]) ||
    includesAny(customerText, ["dashboard", "reconcile", "usage"])
  ) {
    output = {
      issue_type: "metering_discrepancy",
      root_cause: "usage_metering_error",
      customer_impact: "usage_visibility_gap",
      contractual_applicability: "invoice_adjustment_due",
      discrepancy_detected: true,
      recommended_owner: "shared_revops_finance",
      recommended_action: "hold_for_finance_review",
      needs_human_review: true,
      confidence: "medium",
      customer_note:
        "We found a lag in the usage meter pipeline, so the dashboard and invoice preview do not line up yet. We are reviewing the billing impact and will follow up after finance review.",
      internal_note:
        "Owner: shared_revops_finance. Action: hold_for_finance_review because meter ingestion appears delayed and invoice adjustment may be required.",
    };
  } else if (
    incident?.covered_by_sla &&
    (incident?.duration_minutes ?? 0) > 30 &&
    !incident?.scheduled_maintenance
  ) {
    output = {
      issue_type: "incident_impact_review",
      root_cause: includesAny(engineeringText, ["scheduler"]) ? "scheduler_failure" : "capacity_shortfall",
      customer_impact: "outage",
      contractual_applicability: "credit_due",
      discrepancy_detected: false,
      recommended_owner: "shared_revops_engineering",
      recommended_action: "send_explanation_only",
      needs_human_review: false,
      confidence: "high",
      customer_note:
        "We confirmed a covered outage longer than the contract threshold, so the applicable service credit will be handled under your agreement.",
      internal_note:
        "Owner: shared_revops_engineering. Action: send_explanation_only because the outage is covered and clears the credit threshold.",
    };
  } else if (
    includesAny(policyText, ["goodwill"]) ||
    includesAny(customerText, ["renewal", "instability", "trust"]) ||
    includesAny(lower(JSON.stringify(crm.notes ?? [])), ["renewal"])
  ) {
    output = {
      issue_type: "incident_impact_review",
      root_cause: "capacity_shortfall",
      customer_impact: "degraded_performance",
      contractual_applicability: "goodwill_credit_optional",
      discrepancy_detected: false,
      recommended_owner: "shared_revops_engineering",
      recommended_action: "consider_goodwill_credit",
      needs_human_review: true,
      confidence: "medium",
      customer_note:
        "We confirmed degraded performance that does not meet the formal SLA credit threshold. Because the account appears commercially sensitive, we are reviewing next steps internally.",
      internal_note:
        "Owner: shared_revops_engineering. Action: consider_goodwill_credit due to degraded_performance, renewal sensitivity, and repeated customer concern.",
    };
  } else {
    output = {
      issue_type: "ambiguous_case",
      root_cause: "unknown_root_cause",
      customer_impact: "degraded_performance",
      contractual_applicability: "no_sla_breach",
      discrepancy_detected: true,
      recommended_owner: "shared_revops_engineering",
      recommended_action: "hold_for_engineering_review",
      needs_human_review: true,
      confidence: "low",
      customer_note:
        "We found mixed evidence across the incident and billing records, so we are routing this for further review before giving you a final answer.",
      internal_note:
        "Owner: shared_revops_engineering. Action: hold_for_engineering_review because the root cause is still unknown and the evidence remains mixed.",
    };
  }

  return {
    model_name: "heuristic-subprocess",
    model_output: output,
    used_tools: toolCalls.map((call) => call.tool),
    adapter_metadata: {
      protocol_version: request.protocol_version,
      mode: request.mode,
      heuristic: true,
    },
  };
}

try {
  const raw = await readStdin();
  const request = JSON.parse(raw);
  const response = buildResponse(request);
  stdout.write(JSON.stringify(response));
} catch (error) {
  stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
}
