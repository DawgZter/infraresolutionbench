"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const steps = [
  {
    label: "Event Sources",
    highlighted: false,
    detail:
      "Tickets, telemetry, billing alerts, customer emails, and policy documents flow in as raw signals.",
  },
  {
    label: "Case Assembly",
    highlighted: false,
    detail:
      "Evidence from multiple systems is normalized into a structured case packet with all records and context.",
  },
  {
    label: "AI Agent",
    highlighted: true,
    detail:
      "The model receives the case packet and must classify, interpret evidence, route to an owner, and draft communications.",
  },
  {
    label: "Execution",
    highlighted: false,
    detail:
      "Resolution is routed to the appropriate owner, responses are drafted, and risk is flagged for review.",
  },
  {
    label: "Eval Layer",
    highlighted: true,
    detail:
      "Deterministic scoring: 70% exact match, 20% consistency checks, 10% rubric. No LLM judge.",
  },
];

const AUTO_CYCLE_MS = 3000;

export function PipelineFlow() {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isUserHovering, setIsUserHovering] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoCycle = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % steps.length);
    }, AUTO_CYCLE_MS);
  }, []);

  useEffect(() => {
    startAutoCycle();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startAutoCycle]);

  const handleMouseEnter = (index: number) => {
    setIsUserHovering(true);
    setActiveIndex(index);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleMouseLeave = () => {
    setIsUserHovering(false);
    startAutoCycle();
  };

  return (
    <div>
      <div className="flex items-center gap-0">
        {steps.map((step, i) => (
          <div
            key={step.label}
            className="flex items-center flex-1 min-w-0 last:flex-initial"
          >
            <div
              className="relative flex-1 min-w-0 cursor-pointer"
              onMouseEnter={() => handleMouseEnter(i)}
              onMouseLeave={handleMouseLeave}
            >
              <div
                className={`font-mono text-xs font-semibold px-3 py-2.5 rounded-lg text-center transition-all duration-200 ${
                  step.highlighted
                    ? "border-2 border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                    : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
                } ${activeIndex === i ? "shadow-md scale-[1.03]" : ""}`}
              >
                {step.label}
                <div
                  className={`h-0.5 w-4 mx-auto mt-1.5 rounded-full transition-colors duration-200 ${
                    activeIndex === i
                      ? "bg-[var(--color-accent)]"
                      : "bg-[var(--color-border)]"
                  }`}
                />
              </div>
            </div>
            {i < steps.length - 1 && (
              <span className="text-[var(--color-text-tertiary)] text-xs px-1.5 shrink-0">
                &rarr;
              </span>
            )}
          </div>
        ))}
      </div>
      {/* Tooltip area with fixed height to prevent layout shift */}
      <div className="h-20 mt-3 relative">
        {steps.map((step, i) => (
          <div
            key={step.label}
            className={`absolute inset-x-0 top-0 transition-opacity duration-300 ${
              activeIndex === i
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="bg-[var(--color-surface)] border border-[var(--color-border-strong)] rounded-lg shadow-sm px-4 py-3 text-xs text-[var(--color-text-secondary)] leading-relaxed">
              <span className="font-semibold text-[var(--color-text)] font-mono">
                {step.label}
              </span>{" "}
              &middot; {step.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
