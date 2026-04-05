type StringList = readonly string[];

function pick(values: StringList, index: number): string {
  return values[index % values.length] ?? values[0]!;
}

export function customerPricingMismatchVariant(index: number, accountName: string): string {
  return pick(
    [
      `Our invoice preview for ${accountName} looks off and we cannot tell which committed plan it is using.`,
      `We expected different charges this month and want someone to verify the committed plan tied to billing.`,
      `The invoice math does not line up with the contract we signed. Can you confirm the plan and final amount?`,
      `Please review our billing setup. The current preview does not match what our team expected from the order form.`,
    ],
    index,
  );
}

export function crmNoteVariant(index: number): string {
  return pick(
    [
      "No signed amendment appears after the current order form.",
      "Commercial ops note: pricing terms unchanged since the last executed agreement.",
      "Sales handoff mentions the original commitment only.",
      "Account team expects CRM to remain the source of truth for commitment level.",
    ],
    index,
  );
}

export function billingNoteVariant(index: number): string {
  return pick(
    [
      "Billing configuration was last edited during a manual plan update.",
      "Current invoice preview was produced from the active billing plan setting.",
      "No automatic sync event from CRM is recorded for the latest configuration.",
      "Billing snapshot shows a plan value that does not match the signed order form.",
    ],
    index,
  );
}

export function usageSummaryVariant(index: number): string {
  return pick(
    [
      "Usage telemetry is internally consistent and shows no service instability.",
      "Metered usage is complete for the period and there are no compute health anomalies.",
      "Telemetry indicates normal service behavior with full usage coverage.",
      "The usage pipeline is healthy; only commercial records appear inconsistent.",
    ],
    index,
  );
}

export function maybeExtraIrrelevantNote(index: number): string[] {
  if (index % 3 !== 0) {
    return [];
  }

  return [
    pick(
      [
        "Customer also asked for a fresh invoice PDF copy.",
        "Billing contact recently changed on the account.",
        "Account team requested cleaner line-item descriptions next quarter.",
      ],
      index,
    ),
  ];
}

export function customerMeteringVariant(index: number): string {
  return pick(
    [
      "The usage dashboard does not match the invoice preview and we cannot reconcile the gap.",
      "We are seeing different usage totals across billing and the dashboard. Please verify what is actually billable.",
      "Our finance team cannot explain why the invoice preview is ahead of the visible usage meter.",
      "Please help us understand the mismatch between the dashboard and the current invoice estimate.",
    ],
    index,
  );
}

export function engineeringMeteringVariant(index: number): string {
  return pick(
    [
      "Compute services are healthy; only the meter ingestion pipeline is delayed.",
      "No runtime incident is present. The discrepancy comes from delayed meter ingestion.",
      "The compute path is healthy and billing exposure is limited to lagging usage ingestion.",
      "Engineering confirms service health. The only issue is partial propagation in the usage meter pipeline.",
    ],
    index,
  );
}

export function policyMeteringVariant(index: number): string {
  return pick(
    [
      "If usage evidence is delayed or incomplete, hold invoice changes for finance review and correct the final invoice if needed.",
      "When the customer-visible usage dashboard lags the billable meter, route the case for billing review before finalizing invoicing.",
      "Invoice-impacting meter delays require finance review and may result in invoice adjustment.",
      "Usage visibility gaps should be handled as commercial review cases, not SLA remedies.",
    ],
    index,
  );
}

export function customerOutageVariant(index: number, service: string): string {
  return pick(
    [
      `We experienced a covered outage on ${service} for nearly an hour. Please confirm what commercial remedy applies.`,
      `The covered service was unavailable long enough to disrupt our jobs. We need confirmation of the credit process.`,
      `Please review the outage on ${service} and confirm whether the contract credit is being applied.`,
      `Our team saw a sustained outage on the covered service and wants the incident and remedy confirmed.`,
    ],
    index,
  );
}

export function engineeringOutageVariant(index: number, rootCauseLabel: string): string {
  return pick(
    [
      `${rootCauseLabel} caused a covered outage before traffic was restored.`,
      `Engineering confirmed ${rootCauseLabel} as the primary incident driver for the outage window.`,
      `The outage was traced to ${rootCauseLabel}, with service restored after mitigation completed.`,
      `Incident review points to ${rootCauseLabel}; the service remained fully unavailable during the covered window.`,
    ],
    index,
  );
}

export function customerMaintenanceVariant(index: number, service: string): string {
  return pick(
    [
      `Our jobs were unavailable during the announced ${service} maintenance window. Please confirm whether any credits apply.`,
      `We saw downtime during planned maintenance and want to understand the commercial treatment.`,
      `The service was unavailable during maintenance and our team wants to know if that changes billing or credits.`,
      `Please clarify whether the maintenance window on ${service} qualifies for any remedy under our terms.`,
    ],
    index,
  );
}

export function engineeringMaintenanceVariant(index: number): string {
  return pick(
    [
      "Planned control-plane maintenance temporarily paused new submissions before service resumed normally.",
      "Maintenance work was executed within the announced window and created a short customer-visible interruption.",
      "Engineering confirms the interruption aligned with the published maintenance notice.",
      "The maintenance window was planned, announced, and completed without unexpected degradation outside the window.",
    ],
    index,
  );
}

export function customerMisconfigVariant(index: number): string {
  return pick(
    [
      "The platform failed our run again and we think this should be treated as a service issue.",
      "Our training job crashed and the team believes the platform is at fault.",
      "We saw another failed run and need help understanding why the platform rejected it.",
      "Please review this failed job because it looks like an infrastructure problem from our side.",
    ],
    index,
  );
}

export function engineeringMisconfigVariant(index: number, artifactLabel: string): string {
  return pick(
    [
      `Job failed because the uploaded ${artifactLabel} could not be parsed by the runtime.`,
      `Runtime logs show the failure was caused by an invalid ${artifactLabel} supplied by the customer.`,
      `The job failed during validation because the provided ${artifactLabel} did not meet runtime requirements.`,
      `Engineering confirmed a customer-side ${artifactLabel} issue rather than a platform outage.`,
    ],
    index,
  );
}

export function customerGoodwillVariant(index: number): string {
  return pick(
    [
      "We saw another stretch of slow starts and instability right before renewal. Please review what can be done.",
      "Performance dipped again this month and it is affecting confidence as renewal approaches.",
      "None of these incidents were huge individually, but the repeated instability is becoming commercially sensitive.",
      "We need help addressing repeated degraded performance because it is hurting trust close to renewal.",
    ],
    index,
  );
}

export function engineeringGoodwillVariant(index: number): string {
  return pick(
    [
      "Regional capacity shortfall caused temporary degraded performance without crossing the formal outage threshold.",
      "Queue latency increased during a short saturation event, but duration stayed below automatic credit thresholds.",
      "The service degraded briefly because of capacity pressure and then normalized after mitigation.",
      "Engineering confirmed a short-lived degradation event rather than a covered outage.",
    ],
    index,
  );
}

export function customerAmbiguousVariant(index: number): string {
  return pick(
    [
      "Our run stalled during degraded service and the invoice preview also shows overage we did not expect. Please explain what happened.",
      "We saw degraded performance, but now billing also looks off. Can you help us understand what is actually going on?",
      "The service felt unstable and the current invoice preview is higher than expected. We need a clear explanation.",
      "Please review this case because we are seeing both degraded runtime behavior and unexpected billing signals.",
    ],
    index,
  );
}

export function engineeringAmbiguousVariant(index: number): string {
  return pick(
    [
      "Possible capacity pressure was observed, but scheduler logs remain inconclusive.",
      "Engineering saw signs of service degradation, but incident evidence is not yet sufficient to confirm a single cause.",
      "There are hints of capacity saturation, though the available incident data is still mixed.",
      "Operational evidence suggests degraded performance, but the final incident classification remains unresolved.",
    ],
    index,
  );
}

export function policyAmbiguousVariant(index: number): string {
  return pick(
    [
      "Commercial review should consider final incident classification, covered duration, and any confirmed billing discrepancy before applying remedies.",
      "Do not apply a contractual remedy until incident classification and billing variance are both confirmed.",
      "Mixed operational and billing evidence should be routed for review before any SLA or invoice remedy is stated.",
      "If the incident remains unresolved or billing evidence is incomplete, hold the case for manual review rather than promising a remedy.",
    ],
    index,
  );
}
