import type { CSSProperties, ComponentPropsWithoutRef } from "react";

import { queue2Fonts } from "../fonts";

type WordmarkVariant = "single" | "stacked";
type WordmarkTone = "dark" | "light";

export type QueueWordmarkProps = ComponentPropsWithoutRef<"span"> & {
  variant?: WordmarkVariant;
  tone?: WordmarkTone;
  compact?: boolean;
  ariaLabel?: string;
};

const queueStyle: CSSProperties = {
  display: "inline-block",
  fontFamily: queue2Fonts.display.family,
  fontWeight: 900,
  letterSpacing: 0,
  lineHeight: 0.85,
  textTransform: "uppercase"
};

const slashStyle: CSSProperties = {
  color: "var(--primary)",
  display: "inline-block",
  fontFamily: queue2Fonts.mono.family,
  fontWeight: 900,
  letterSpacing: 0,
  lineHeight: 0.85
};

export function QueueWordmark({
  variant = "single",
  tone = "dark",
  compact = false,
  ariaLabel = "QUEUE dois",
  className,
  style,
  ...props
}: QueueWordmarkProps) {
  const ink = tone === "light" ? "var(--bg)" : "var(--ink)";
  const size = compact ? "2.25rem" : "clamp(3rem, 11vw, 7.5rem)";
  const gap = compact ? "0.08em" : "0.11em";
  const classes = ["queue2-wordmark", `queue2-wordmark--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  const rootStyle: CSSProperties = {
    alignItems: variant === "single" ? "baseline" : "flex-start",
    color: ink,
    display: "inline-flex",
    flexDirection: variant === "single" ? "row" : "column",
    fontSize: size,
    gap: variant === "single" ? "0.03em" : gap,
    lineHeight: 0.85,
    ...style
  };

  return (
    <span aria-label={ariaLabel} className={classes} role="img" style={rootStyle} {...props}>
      <span aria-hidden="true" style={queueStyle}>
        QUEUE
      </span>
      <span
        aria-hidden="true"
        style={{
          ...slashStyle,
          fontSize: variant === "single" ? "0.85em" : "1.1em",
          transform: variant === "single" ? "translateY(0.08em)" : "none"
        }}
      >
        /2
      </span>
    </span>
  );
}

export function QueueWordmarkSingle(props: Omit<QueueWordmarkProps, "variant">) {
  return <QueueWordmark {...props} variant="single" />;
}

export function QueueWordmarkStacked(props: Omit<QueueWordmarkProps, "variant">) {
  return <QueueWordmark {...props} variant="stacked" />;
}
