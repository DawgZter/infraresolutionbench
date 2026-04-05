import type { CasePacket, GoldCase } from "@infraresolutionbench/shared";

export type EnvironmentToolName =
  | "get_crm_record"
  | "get_billing_record"
  | "get_usage_record"
  | "get_incident_record"
  | "get_customer_note"
  | "get_policy_snippet"
  | "get_calculator_output";

export type EnvironmentToolDefinition = {
  name: EnvironmentToolName;
  description: string;
  inputExample: string;
};

function getPacket(caseOrPacket: GoldCase | CasePacket): CasePacket {
  return "case_packet" in caseOrPacket ? caseOrPacket.case_packet : caseOrPacket;
}

export function get_crm_record(caseOrPacket: GoldCase | CasePacket) {
  return getPacket(caseOrPacket).crm_record;
}

export function get_billing_record(caseOrPacket: GoldCase | CasePacket) {
  return getPacket(caseOrPacket).billing_record;
}

export function get_usage_record(caseOrPacket: GoldCase | CasePacket) {
  return getPacket(caseOrPacket).usage_record;
}

export function get_incident_record(caseOrPacket: GoldCase | CasePacket) {
  return getPacket(caseOrPacket).incident_record;
}

export function get_customer_note(caseOrPacket: GoldCase | CasePacket) {
  return getPacket(caseOrPacket).customer_note;
}

export function get_policy_snippet(caseOrPacket: GoldCase | CasePacket) {
  return getPacket(caseOrPacket).policy_snippet;
}

export function get_calculator_output(caseOrPacket: GoldCase | CasePacket) {
  return getPacket(caseOrPacket).calculator_output ?? null;
}

export const LOCAL_READ_ONLY_TOOLS = {
  get_crm_record,
  get_billing_record,
  get_usage_record,
  get_incident_record,
  get_customer_note,
  get_policy_snippet,
  get_calculator_output,
};

export function getEnvironmentToolDefinitions(): EnvironmentToolDefinition[] {
  return [
    {
      name: "get_crm_record",
      description: "Returns the CRM and account record for the case.",
      inputExample: 'case_id="gold_case_001"',
    },
    {
      name: "get_billing_record",
      description: "Returns the billing and pricing record for the case.",
      inputExample: 'case_id="gold_case_001"',
    },
    {
      name: "get_usage_record",
      description: "Returns the usage and telemetry summary for the case.",
      inputExample: 'case_id="gold_case_001"',
    },
    {
      name: "get_incident_record",
      description: "Returns the incident or engineering record for the case, if present.",
      inputExample: 'case_id="gold_case_001"',
    },
    {
      name: "get_customer_note",
      description: "Returns the customer-authored note or complaint for the case.",
      inputExample: 'case_id="gold_case_001"',
    },
    {
      name: "get_policy_snippet",
      description: "Returns the relevant policy or SLA snippet for the case, if present.",
      inputExample: 'case_id="gold_case_001"',
    },
    {
      name: "get_calculator_output",
      description: "Returns calculator or invoice helper output when the case includes it.",
      inputExample: 'case_id="gold_case_001"',
    },
  ];
}
