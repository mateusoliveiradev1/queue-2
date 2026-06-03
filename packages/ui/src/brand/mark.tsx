import type { CSSProperties, ComponentPropsWithoutRef } from "react";

import { queue2Fonts } from "../fonts";

export type QueueMarkProps = ComponentPropsWithoutRef<"span"> & {
  label?: string;
  size?: number;
  tone?: "dark" | "light";
};

export type RoulettePointerProps = ComponentPropsWithoutRef<"span"> & {
  tone?: "primary" | "accent";
  label?: string;
};

export function QueueMark({
  label = "QUEUE dois",
  size = 48,
  tone = "dark",
  className,
  style,
  ...props
}: QueueMarkProps) {
  const classes = ["queue2-mark", "queue2-grain", className].filter(Boolean).join(" ");
  const markStyle: CSSProperties = {
    alignItems: "center",
    background: tone === "light" ? "var(--ink)" : "var(--surface)",
    border: "1px solid color-mix(in oklch, var(--primary) 42%, transparent)",
    borderRadius: "var(--radius-sharp)",
    color: "var(--primary)",
    display: "inline-flex",
    fontFamily: queue2Fonts.mono.family,
    fontSize: Math.max(18, size * 0.42),
    fontWeight: 900,
    height: size,
    justifyContent: "center",
    lineHeight: 1,
    overflow: "hidden",
    width: size,
    ...style
  };

  return (
    <span aria-label={label} className={classes} role="img" style={markStyle} {...props}>
      <span aria-hidden="true">/2</span>
    </span>
  );
}

export function RoulettePointer({
  tone = "primary",
  label = "Ponteiro da roleta",
  className,
  style,
  ...props
}: RoulettePointerProps) {
  const color = tone === "primary" ? "var(--primary)" : "var(--accent)";
  const classes = ["queue2-roulette-pointer", className].filter(Boolean).join(" ");

  return (
    <span
      aria-label={label}
      className={classes}
      role="img"
      style={{
        alignItems: "center",
        color,
        display: "inline-flex",
        height: 24,
        justifyContent: "center",
        width: 24,
        ...style
      }}
      {...props}
    >
      <svg aria-hidden="true" fill="none" height="24" viewBox="0 0 24 24" width="24">
        <path d="M4 5l11 7L4 19V5Z" fill="currentColor" />
        <path d="M15 8l4 4-4 4-4-4 4-4Z" fill="currentColor" opacity="0.72" />
      </svg>
    </span>
  );
}

export function RouletteDivider({ label = "Ritual da dupla" }: { label?: string }) {
  return (
    <div
      aria-label={label}
      role="separator"
      style={{
        alignItems: "center",
        color: "var(--primary)",
        display: "flex",
        gap: "var(--space-4)",
        width: "100%"
      }}
    >
      <span
        aria-hidden="true"
        style={{
          background: "color-mix(in oklch, currentColor 48%, transparent)",
          flex: 1,
          height: 1
        }}
      />
      <RoulettePointer aria-hidden="true" label="" />
      <span
        aria-hidden="true"
        style={{
          background: "color-mix(in oklch, currentColor 48%, transparent)",
          flex: 1,
          height: 1
        }}
      />
    </div>
  );
}
