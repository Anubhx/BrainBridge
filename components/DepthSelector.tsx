"use client";

import type { Depth } from "@/lib/db";

interface DepthSelectorProps {
  value: Depth;
  onChange: (depth: Depth) => void;
}

const DEPTH_CONFIG: {
  id: Depth;
  label: string;
  color: string;
  bg: string;
  tooltip: string;
}[] = [
  {
    id: "quick",
    label: "QUICK",
    color: "#E8A33D",
    bg: "rgba(232, 163, 61, 0.10)",
    tooltip: "1-sentence summary, 3 tags — fast single AI call",
  },
  {
    id: "deep",
    label: "DEEP",
    color: "#5B9BD5",
    bg: "rgba(91, 155, 213, 0.10)",
    tooltip: "Full summary, key concepts, links — Gemini + Mistral",
  },
  {
    id: "research",
    label: "RESEARCH",
    color: "#9B7ED4",
    bg: "rgba(155, 126, 212, 0.10)",
    tooltip: "6-section structured report — Gemini + Llama + Mistral",
  },
];

export function DepthSelector({ value, onChange }: DepthSelectorProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "2px",
        marginBottom: "0.5rem",
      }}
      role="tablist"
      aria-label="Capture depth mode"
    >
      {DEPTH_CONFIG.map((d) => {
        const isActive = value === d.id;
        return (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            title={d.tooltip}
            onClick={() => onChange(d.id)}
            className="bb-mono"
            style={{
              height: "28px",
              padding: "0 10px",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              borderRadius: "2px",
              border: `1px solid ${isActive ? d.color : "#383633"}`,
              backgroundColor: isActive ? d.bg : "transparent",
              color: isActive ? d.color : "#9A948E",
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            [{d.label}]
          </button>
        );
      })}
    </div>
  );
}
