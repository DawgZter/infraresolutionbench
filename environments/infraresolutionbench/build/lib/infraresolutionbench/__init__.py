from __future__ import annotations

from collections import deque
import json
import re
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Any

from datasets import Dataset
import verifiers as vf

BENCHMARK_SYSTEM_PROMPT = """You are an AI copilot for AI infrastructure commercial operations.

You will receive records from multiple internal systems:
- CRM/account record
- billing/pricing record
- usage summary
- incident/engineering notes
- customer note
- policy snippet if relevant

Your task:
1. identify the likely issue type
2. determine root cause and customer impact
3. determine contractual applicability
4. detect whether systems disagree
5. recommend an owner and bounded next action
6. decide whether human review is required
7. draft a customer note
8. draft an internal ops note

Important:
- do not assume facts not present
- if evidence is conflicting, reflect that in confidence and review recommendation
- do not recompute billing formulas unless calculator output is explicitly missing
- return valid JSON only"""

OUTPUT_SCHEMA_KEYS = [
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
]

ISSUE_TYPE_VALUES = [
    "pricing_config_mismatch",
    "metering_discrepancy",
    "incident_impact_review",
    "customer_caused_issue",
    "policy_applicability_review",
    "ambiguous_case",
]

ROOT_CAUSE_VALUES = [
    "capacity_shortfall",
    "scheduler_failure",
    "gpu_node_failure",
    "usage_metering_error",
    "billing_config_out_of_sync_with_crm",
    "customer_misconfiguration",
    "scheduled_maintenance",
    "unknown_root_cause",
]

CUSTOMER_IMPACT_VALUES = [
    "no_customer_impact",
    "outage",
    "degraded_performance",
    "delayed_job_start",
    "job_failure",
    "retry_storm",
    "usage_visibility_gap",
    "invoice_confusion",
]

CONTRACTUAL_APPLICABILITY_VALUES = [
    "not_an_sla_case",
    "sla_breach",
    "no_sla_breach",
    "sla_excluded_scheduled_maintenance",
    "sla_excluded_customer_caused",
    "credit_due",
    "no_credit_due",
    "invoice_adjustment_due",
    "goodwill_credit_optional",
]

RECOMMENDED_OWNER_VALUES = [
    "revops_owner",
    "finance_owner",
    "engineering_owner",
    "shared_revops_finance",
    "shared_revops_engineering",
    "human_review_required",
]

RECOMMENDED_ACTION_VALUES = [
    "send_explanation_only",
    "hold_for_revops_review",
    "hold_for_finance_review",
    "hold_for_engineering_review",
    "consider_goodwill_credit",
    "no_action_required",
]

CONFIDENCE_VALUES = ["high", "medium", "low"]

EXACT_SCORABLE_FIELDS = [
    "issue_type",
    "root_cause",
    "customer_impact",
    "contractual_applicability",
    "discrepancy_detected",
    "recommended_owner",
    "recommended_action",
    "needs_human_review",
    "confidence",
]

OWNER_KEYWORDS = {
    "revops_owner": ["revops", "revenue operations", "commercial ops"],
    "finance_owner": ["finance", "billing team", "finance review"],
    "engineering_owner": ["engineering", "platform team", "incident team"],
    "shared_revops_finance": ["revops", "finance"],
    "shared_revops_engineering": ["revops", "engineering"],
    "human_review_required": ["human review", "manual review"],
}

ACTION_KEYWORDS = {
    "send_explanation_only": ["explain", "explanation", "clarify", "share", "follow up"],
    "hold_for_revops_review": ["hold", "revops review", "commercial review"],
    "hold_for_finance_review": ["hold", "finance review", "billing review"],
    "hold_for_engineering_review": ["hold", "engineering review", "incident review"],
    "consider_goodwill_credit": ["goodwill", "commercial gesture", "gesture", "review"],
    "no_action_required": ["no action required", "no further action"],
}

ISSUE_KEYWORDS = {
    "pricing_config_mismatch": ["pricing", "plan", "billing", "contract", "mismatch", "invoice"],
    "metering_discrepancy": ["meter", "usage", "dashboard", "invoice", "reconcile"],
    "incident_impact_review": ["incident", "outage", "degraded", "performance", "availability"],
    "customer_caused_issue": ["configuration", "checkpoint", "artifact", "customer input", "job failed"],
    "policy_applicability_review": ["policy", "contract", "burst", "credits", "invoice", "pricing"],
    "ambiguous_case": ["review", "mixed", "unclear", "investigating", "follow up"],
}

IMPACT_KEYWORDS = {
    "no_customer_impact": ["no customer impact"],
    "outage": ["outage", "unavailable", "downtime"],
    "degraded_performance": ["degraded", "slow", "latency", "performance"],
    "delayed_job_start": ["delayed", "slow start", "queue"],
    "job_failure": ["job failed", "failure", "run failed"],
    "retry_storm": ["retries", "retry storm"],
    "usage_visibility_gap": ["usage", "dashboard", "visibility", "meter"],
    "invoice_confusion": ["invoice", "billing", "charges", "cost"],
}

CREDIT_KEYWORDS = ["service credit", "credit due", "credit will", "credit applies"]
SLA_BREACH_KEYWORDS = ["sla breach", "breach of sla"]
DISCREPANCY_KEYWORDS = ["systems disagree", "mismatch between systems", "records disagree"]
FINALITY_KEYWORDS = ["final resolution", "fully resolved", "confirmed final answer"]
UNCERTAINTY_KEYWORDS = [
    "mixed evidence",
    "review",
    "investigating",
    "follow up",
    "follow-up",
    "inconclusive",
    "unclear",
    "unknown",
    "not yet confirmed",
    "still reviewing",
]
REVIEW_NEGATION_KEYWORDS = [
    "no further review",
    "no review needed",
    "no additional review",
    "review is not needed",
]
CERTAINTY_OVERCLAIM_KEYWORDS = [
    "definitely",
    "fully confirmed",
    "definitive",
    "final resolution",
    "confirmed final answer",
]
ROOT_CAUSE_CERTAINTY_KEYWORDS = [
    "confirmed root cause",
    "definitive cause",
    "determined root cause",
    "final root cause",
]
UNKNOWN_ROOT_CAUSE_KEYWORDS = [
    "root cause remains unknown",
    "root cause is unknown",
    "root cause still unknown",
    "cause remains unknown",
    "cause is still unknown",
]


def _package_data_root() -> Path:
    return Path(__file__).resolve().parent / "data"


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _resolve_data_roots() -> tuple[Path, Path]:
    packaged_root = _package_data_root()
    packaged_gold_dir = packaged_root / "gold_cases"
    packaged_generated_dir = packaged_root / "generated_cases"

    if packaged_gold_dir.exists() and packaged_generated_dir.exists():
        return packaged_gold_dir, packaged_generated_dir

    repo_root = _repo_root()
    return (
        repo_root / "packages" / "data" / "gold_cases",
        repo_root / "packages" / "data" / "generated_cases",
    )


def _output_schema_reminder() -> str:
    bullet_lines = "\n".join(f"- {key}" for key in OUTPUT_SCHEMA_KEYS)
    return f"Return a single JSON object with exactly these keys:\n{bullet_lines}"


def _enum_value_reminder() -> str:
    return "\n".join(
        [
            "Use the exact benchmark enum strings for structured fields.",
            f"- issue_type: {', '.join(ISSUE_TYPE_VALUES)}",
            f"- root_cause: {', '.join(ROOT_CAUSE_VALUES)}",
            f"- customer_impact: {', '.join(CUSTOMER_IMPACT_VALUES)}",
            f"- contractual_applicability: {', '.join(CONTRACTUAL_APPLICABILITY_VALUES)}",
            f"- recommended_owner: {', '.join(RECOMMENDED_OWNER_VALUES)}",
            f"- recommended_action: {', '.join(RECOMMENDED_ACTION_VALUES)}",
            f"- confidence: {', '.join(CONFIDENCE_VALUES)}",
            "- discrepancy_detected and needs_human_review must be booleans.",
            "- Do not replace enum values with prose labels or email addresses.",
        ]
    )


def _tool_definitions() -> list[dict[str, str]]:
    return [
        {
            "name": "get_crm_record",
            "description": "Returns the CRM and account record for the case.",
            "inputExample": 'case_id="gold_case_001"',
        },
        {
            "name": "get_billing_record",
            "description": "Returns the billing and pricing record for the case.",
            "inputExample": 'case_id="gold_case_001"',
        },
        {
            "name": "get_usage_record",
            "description": "Returns the usage and telemetry summary for the case.",
            "inputExample": 'case_id="gold_case_001"',
        },
        {
            "name": "get_incident_record",
            "description": "Returns the incident or engineering record for the case, if present.",
            "inputExample": 'case_id="gold_case_001"',
        },
        {
            "name": "get_customer_note",
            "description": "Returns the customer-authored note or complaint for the case.",
            "inputExample": 'case_id="gold_case_001"',
        },
        {
            "name": "get_policy_snippet",
            "description": "Returns the relevant policy or SLA snippet for the case, if present.",
            "inputExample": 'case_id="gold_case_001"',
        },
        {
            "name": "get_calculator_output",
            "description": "Returns calculator or invoice helper output when the case includes it.",
            "inputExample": 'case_id="gold_case_001"',
        },
    ]


def _packet_prompt(case_packet: dict[str, Any]) -> str:
    return "\n".join(
        [
            f"Case ID: {case_packet['case_id']}",
            "",
            "Here is the full case packet:",
            json.dumps(case_packet, indent=2),
            "",
            "Draft note guidance:",
            "- Do not simply repeat or paraphrase the raw customer complaint as the final customer_note.",
            "- customer_note should explain the evidence-based outcome in customer-facing language and state the next step when one exists.",
            "- internal_note should explicitly include the owner and action in plain text when the case has a clear owner and next step.",
            "- For customer-caused failures, customer_note should say the platform remained healthy, explain that the failure was caused by a customer artifact or configuration issue, note that SLA credits do not apply, and offer validation details or rerun guidance.",
            "",
            _enum_value_reminder(),
            "",
            _output_schema_reminder(),
        ]
    )


def _tools_prompt(case_packet: dict[str, Any]) -> str:
    return "\n".join(
        [
            f"Case ID: {case_packet['case_id']}",
            "",
            "Use the available read-only tools to inspect the case before deciding.",
            "You may call any tool multiple times, but do not invent facts not returned by the tools.",
            "",
            "Recommended tool checklist:",
            "- Always inspect CRM, billing, usage, and incident records before answering.",
            "- Inspect the customer note before drafting the customer-facing note.",
            "- Inspect the policy snippet before deciding contractual applicability.",
            "- Inspect calculator output whenever billing, invoice, credits, burst usage, or metering is relevant.",
            "- When records show a billing or invoice discrepancy but service health is otherwise normal, prioritize commercial applicability and finance routing over generic incident escalation.",
            "- When policy or incident evidence clearly shows a covered outage exceeded the threshold, prefer the concrete commercial outcome credit_due over generic sla_breach labeling.",
            "- When telemetry is healthy, there is no platform incident, and engineering notes blame invalid customer inputs, artifacts, or configuration, treat the case as customer_caused_issue rather than a platform outage.",
            "",
            "Important:",
            "- Use the provided case ID when calling tools.",
            "- If evidence is conflicting, reflect that in confidence and review recommendation.",
            "- If the evidence stays mixed, preserve ambiguity, use low confidence when appropriate, and prefer human review.",
            "- If calculator output or billing-policy evidence directly determines the commercial result, use that result in contractual_applicability.",
            "- Metering, invoice preview, dashboard mismatch, credits consumption, or billing pipeline lag usually point toward shared_revops_finance or finance_owner, not pure engineering_owner.",
            "- A clear covered outage above the contractual threshold usually maps to credit_due, shared_revops_engineering, send_explanation_only, and no human review unless the evidence is still conflicting.",
            "- If engineering attribution and policy both show the failure is customer-caused, usually map to customer_caused_issue, customer_misconfiguration, sla_excluded_customer_caused, engineering_owner, send_explanation_only, and no human review.",
            "- Do not simply echo the customer complaint in customer_note; rewrite it as the evidence-based resolution and include the next step.",
            "- When the case has a clear owner and action, internal_note should say them explicitly using words like 'Owner:' and 'Action:'.",
            "- For customer-caused failures, customer_note should explain that the platform was healthy, the failure came from customer-provided configuration or artifacts, credits do not apply, and engineering can share validation details or rerun guidance.",
            "- Use exact benchmark enum strings, not free-form labels.",
            "- Return valid JSON only once you are ready to answer.",
            "",
            _enum_value_reminder(),
            _output_schema_reminder(),
        ]
    )


def _build_messages(case_packet: dict[str, Any], prompt_mode: str) -> list[dict[str, str]]:
    user_prompt = _packet_prompt(case_packet) if prompt_mode == "packet" else _tools_prompt(case_packet)
    return [
        {"role": "system", "content": BENCHMARK_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]


def _normalize(text: str) -> str:
    return text.lower()


def _includes_any(text: str, candidates: list[str]) -> bool:
    return any(candidate in text for candidate in candidates)


def _days_until(date_string: str) -> int:
    today = "2026-04-05"
    current = date.fromisoformat(today)
    target = date.fromisoformat(date_string)
    return (target - current).days


def _is_account_context_relevant(case_packet: dict[str, Any]) -> bool:
    renewal_date = case_packet["crm_record"].get("renewal_date")
    renewal_days = None if renewal_date is None else _days_until(renewal_date)
    crm_notes = case_packet["crm_record"].get("notes", [])
    return (
        case_packet["crm_record"].get("account_tier") == "strategic"
        or (renewal_days is not None and renewal_days <= 14)
        or any("renewal" in _normalize(note) for note in crm_notes)
    )


def _strip_json_fences(text: str) -> str:
    stripped = text.strip()
    fenced_match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", stripped, flags=re.DOTALL)
    if fenced_match:
        return fenced_match.group(1).strip()
    return stripped


def _extract_json_object(text: str) -> str | None:
    stripped = text.strip()
    if not stripped:
        return None

    start = stripped.find("{")
    if start == -1:
        return None

    depth = 0
    in_string = False
    escaped = False

    for index in range(start, len(stripped)):
        character = stripped[index]

        if escaped:
            escaped = False
            continue

        if character == "\\":
            escaped = True
            continue

        if character == "\"":
            in_string = not in_string
            continue

        if in_string:
            continue

        if character == "{":
            depth += 1
        elif character == "}":
            depth -= 1
            if depth == 0:
                return stripped[start : index + 1]

    return None


def _parse_model_output(completion: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not completion:
        return None

    raw_content = completion[-1].get("content", "")
    if not isinstance(raw_content, str) or not raw_content.strip():
        return None

    cleaned = _strip_json_fences(raw_content)
    extracted = _extract_json_object(cleaned)
    if extracted is not None:
        cleaned = extracted

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        return None

    if not isinstance(parsed, dict):
        return None

    if any(key not in parsed for key in OUTPUT_SCHEMA_KEYS):
        return None

    return parsed


def _score_exact(ground_truth: dict[str, Any], model_output: dict[str, Any] | None) -> float:
    if model_output is None:
        return 0.0
    passed = sum(1 for field in EXACT_SCORABLE_FIELDS if ground_truth.get(field) == model_output.get(field))
    return passed / len(EXACT_SCORABLE_FIELDS)


def _score_consistency(model_output: dict[str, Any] | None) -> float:
    if model_output is None:
        return 0.0

    customer_note = _normalize(str(model_output.get("customer_note", "")))
    internal_note = _normalize(str(model_output.get("internal_note", "")))
    contractual_applicability = model_output.get("contractual_applicability")
    discrepancy_detected = bool(model_output.get("discrepancy_detected"))
    needs_human_review = bool(model_output.get("needs_human_review"))
    recommended_owner = str(model_output.get("recommended_owner"))
    recommended_action = str(model_output.get("recommended_action"))
    root_cause = str(model_output.get("root_cause"))
    issue_type = str(model_output.get("issue_type"))
    confidence = str(model_output.get("confidence"))

    credit_allowed = contractual_applicability in {"credit_due", "goodwill_credit_optional"}
    ambiguity_requires_uncertainty = (
        issue_type == "ambiguous_case"
        or root_cause == "unknown_root_cause"
        or confidence == "low"
    )

    checks = [
        credit_allowed or not _includes_any(customer_note, CREDIT_KEYWORDS),
        credit_allowed or not _includes_any(internal_note, CREDIT_KEYWORDS),
        not (
            contractual_applicability
            in {
                "not_an_sla_case",
                "sla_excluded_scheduled_maintenance",
                "sla_excluded_customer_caused",
                "no_sla_breach",
                "no_credit_due",
            }
            and _includes_any(customer_note, SLA_BREACH_KEYWORDS)
        ),
        discrepancy_detected or not _includes_any(customer_note, DISCREPANCY_KEYWORDS),
        not (needs_human_review and _includes_any(customer_note, FINALITY_KEYWORDS)),
        _includes_any(internal_note, OWNER_KEYWORDS.get(recommended_owner, [])),
        _includes_any(internal_note, ACTION_KEYWORDS.get(recommended_action, [])),
        not ambiguity_requires_uncertainty
        or (
            _includes_any(customer_note, UNCERTAINTY_KEYWORDS)
            and not (
                _includes_any(customer_note, CERTAINTY_OVERCLAIM_KEYWORDS)
                or _includes_any(customer_note, REVIEW_NEGATION_KEYWORDS)
            )
        ),
        not ambiguity_requires_uncertainty
        or (
            _includes_any(internal_note, UNCERTAINTY_KEYWORDS)
            and not (
                _includes_any(internal_note, CERTAINTY_OVERCLAIM_KEYWORDS)
                or _includes_any(internal_note, REVIEW_NEGATION_KEYWORDS)
            )
        ),
        not (
            root_cause == "unknown_root_cause"
            and (
                _includes_any(customer_note, ROOT_CAUSE_CERTAINTY_KEYWORDS)
                or _includes_any(internal_note, ROOT_CAUSE_CERTAINTY_KEYWORDS)
            )
            and not (
                _includes_any(customer_note, UNKNOWN_ROOT_CAUSE_KEYWORDS)
                and _includes_any(internal_note, UNKNOWN_ROOT_CAUSE_KEYWORDS)
            )
        ),
    ]

    return sum(1 for check in checks if check) / len(checks)


def _score_rubric(case_packet: dict[str, Any], model_output: dict[str, Any] | None) -> float:
    if model_output is None:
        return 0.0

    customer_note = _normalize(str(model_output.get("customer_note", "")))
    internal_note = _normalize(str(model_output.get("internal_note", "")))
    issue_type = str(model_output.get("issue_type"))
    customer_impact = str(model_output.get("customer_impact"))
    needs_human_review = bool(model_output.get("needs_human_review"))

    checks = [
        _includes_any(customer_note, ISSUE_KEYWORDS.get(issue_type, []))
        or _includes_any(customer_note, IMPACT_KEYWORDS.get(customer_impact, [])),
        (not needs_human_review)
        or _includes_any(customer_note, ["review", "follow up", "investigate", "routing", "route"]),
        _includes_any(internal_note, ["owner", "revops", "finance", "engineering", "review"]),
        _includes_any(internal_note, ["action", "hold", "send", "consider", "review", "no action"]),
        (not _is_account_context_relevant(case_packet))
        or _includes_any(internal_note, ["renewal", "strategic", "enterprise", "account"]),
    ]

    return sum(1 for check in checks if check) / len(checks)


async def _composite_reward(completion, info) -> float:
    model_output = _parse_model_output(completion)
    ground_truth = info["ground_truth"]
    case_packet = info["case_packet"]
    exact_score = _score_exact(ground_truth, model_output)
    consistency_score = _score_consistency(model_output)
    rubric_score = _score_rubric(case_packet, model_output)
    return (exact_score * 0.7) + (consistency_score * 0.2) + (rubric_score * 0.1)


async def _exact_metric(completion, info) -> float:
    return _score_exact(info["ground_truth"], _parse_model_output(completion))


async def _consistency_metric(completion, info) -> float:
    return _score_consistency(_parse_model_output(completion))


async def _rubric_metric(completion, info) -> float:
    return _score_rubric(info["case_packet"], _parse_model_output(completion))


async def _json_valid_metric(completion) -> float:
    return 1.0 if _parse_model_output(completion) is not None else 0.0


def _parse_generator_families(generator_family: str | None) -> set[str] | None:
    if generator_family is None:
        return None

    families = {item.strip() for item in generator_family.split(",") if item.strip()}
    return families or None


def _load_case_files(case_source: str, generator_family: str | None = None) -> list[Path]:
    gold_dir, generated_dir = _resolve_data_roots()
    allowed_families = _parse_generator_families(generator_family)

    if allowed_families and case_source == "gold":
        raise ValueError("generator_family filtering is only supported for synthetic or all case sources.")

    if case_source == "gold":
        roots = [gold_dir]
    elif case_source in {"synthetic", "generated"}:
        roots = [generated_dir]
    elif case_source == "all":
        roots = [gold_dir, generated_dir]
    else:
        raise ValueError(f"Unsupported case_source: {case_source}")

    case_files: list[Path] = []
    for root in roots:
        files = sorted(root.rglob("*.json"))
        if allowed_families and root == generated_dir:
            files = [case_file for case_file in files if case_file.parent.name in allowed_families]
        if case_source in {"synthetic", "generated"} and root == generated_dir:
            files = _interleave_generated_case_files(files)
        case_files.extend(files)
    return case_files


def _interleave_generated_case_files(case_files: list[Path]) -> list[Path]:
    families: dict[str, deque[Path]] = {}
    for case_file in case_files:
        family = case_file.parent.name
        families.setdefault(family, deque()).append(case_file)

    ordered_families = sorted(families)
    interleaved: list[Path] = []

    while True:
        added_any = False
        for family in ordered_families:
            bucket = families[family]
            if not bucket:
                continue
            interleaved.append(bucket.popleft())
            added_any = True

        if not added_any:
            break

    return interleaved


@lru_cache(maxsize=1)
def _load_case_index() -> dict[str, dict[str, Any]]:
    case_index: dict[str, dict[str, Any]] = {}
    for case_file in _load_case_files("all"):
        case = json.loads(case_file.read_text())
        case_packet = case["case_packet"]
        case_index[case_packet["case_id"]] = case_packet
    return case_index


def _lookup_case_packet(case_id: str) -> dict[str, Any]:
    case_packet = _load_case_index().get(case_id)
    if case_packet is None:
        raise ValueError(f"Unknown case_id: {case_id}")
    return case_packet


def _render_tool_result(payload: Any) -> str:
    return json.dumps(payload, indent=2, sort_keys=True)


async def get_crm_record(case_id: str) -> str:
    """Return the CRM and account record for a case.

    Args:
        case_id: The benchmark case identifier.

    Returns:
        The CRM/account record as JSON.
    """
    return _render_tool_result(_lookup_case_packet(case_id)["crm_record"])


async def get_billing_record(case_id: str) -> str:
    """Return the billing and pricing record for a case.

    Args:
        case_id: The benchmark case identifier.

    Returns:
        The billing/pricing record as JSON.
    """
    return _render_tool_result(_lookup_case_packet(case_id)["billing_record"])


async def get_usage_record(case_id: str) -> str:
    """Return the usage and telemetry summary for a case.

    Args:
        case_id: The benchmark case identifier.

    Returns:
        The usage summary as JSON.
    """
    return _render_tool_result(_lookup_case_packet(case_id)["usage_record"])


async def get_incident_record(case_id: str) -> str:
    """Return the incident or engineering record for a case.

    Args:
        case_id: The benchmark case identifier.

    Returns:
        The incident record as JSON, or null when absent.
    """
    return _render_tool_result(_lookup_case_packet(case_id).get("incident_record"))


async def get_customer_note(case_id: str) -> str:
    """Return the customer-authored note for a case.

    Args:
        case_id: The benchmark case identifier.

    Returns:
        The customer note as JSON.
    """
    return _render_tool_result(_lookup_case_packet(case_id)["customer_note"])


async def get_policy_snippet(case_id: str) -> str:
    """Return the relevant policy or SLA snippet for a case.

    Args:
        case_id: The benchmark case identifier.

    Returns:
        The policy snippet as JSON, or null when absent.
    """
    return _render_tool_result(_lookup_case_packet(case_id).get("policy_snippet"))


async def get_calculator_output(case_id: str) -> str:
    """Return the calculator or invoice helper output for a case.

    Args:
        case_id: The benchmark case identifier.

    Returns:
        The calculator output as JSON, or null when absent.
    """
    return _render_tool_result(_lookup_case_packet(case_id).get("calculator_output"))


def _environment_tools() -> list[Any]:
    return [
        get_crm_record,
        get_billing_record,
        get_usage_record,
        get_incident_record,
        get_customer_note,
        get_policy_snippet,
        get_calculator_output,
    ]


def _load_cases(
    case_source: str,
    prompt_mode: str,
    limit: int | None,
    generator_family: str | None,
) -> Dataset:
    case_files = _load_case_files(case_source, generator_family=generator_family)
    if limit is not None:
        case_files = case_files[:limit]

    records = []
    for case_file in case_files:
        case = json.loads(case_file.read_text())
        case_packet = case["case_packet"]
        records.append(
            {
                "prompt": _build_messages(case_packet, prompt_mode),
                "answer": json.dumps(case["ground_truth"], sort_keys=True),
                "info": {
                    "case_id": case_packet["case_id"],
                    "title": case_packet["title"],
                    "prompt_mode": prompt_mode,
                    "authoring_style": case["metadata"]["authoring_style"],
                    "generator_family": case["hidden_state"]["generator_family"],
                    "case_packet": case_packet,
                    "ground_truth": case["ground_truth"],
                },
            }
        )

    return Dataset.from_list(records)


def _coerce_limit(value: str | int | None) -> int | None:
    if value is None or value == "":
        return None
    if isinstance(value, int):
        return value
    return int(value)


def load_environment(
    case_source: str = "gold",
    prompt_mode: str = "packet",
    limit: str | int | None = None,
    generator_family: str | None = None,
) -> vf.Environment:
    if prompt_mode not in {"packet", "tools"}:
        raise ValueError(f"Unsupported prompt_mode: {prompt_mode}")

    parsed_limit = _coerce_limit(limit)
    dataset = _load_cases(
        case_source=case_source,
        prompt_mode=prompt_mode,
        limit=parsed_limit,
        generator_family=generator_family,
    )
    rubric = vf.Rubric(funcs=[_composite_reward])
    rubric.add_metric(_exact_metric)
    rubric.add_metric(_consistency_metric)
    rubric.add_metric(_rubric_metric)
    rubric.add_metric(_json_valid_metric)
    if prompt_mode == "tools":
        return vf.ToolEnv(
            dataset=dataset,
            eval_dataset=dataset,
            rubric=rubric,
            tools=_environment_tools(),
            max_turns=8,
        )

    return vf.SingleTurnEnv(dataset=dataset, eval_dataset=dataset, rubric=rubric)
