import type { ComponentPropsWithoutRef } from "react";

export type QueueLoadingProps = ComponentPropsWithoutRef<"div"> & {
  label?: string;
  showText?: boolean;
};

export function QueueLoading({
  label = "Carregando a fila...",
  showText = true,
  className,
  ...props
}: QueueLoadingProps) {
  const classes = ["queue2-loading", className].filter(Boolean).join(" ");

  return (
    <div
      aria-label={label}
      aria-live="polite"
      className={classes}
      role="status"
      style={{
        alignItems: "center",
        color: "var(--ink)",
        display: "inline-flex",
        gap: "var(--space-4)",
        minHeight: 44
      }}
      {...props}
    >
      <svg
        aria-hidden="true"
        className="queue2-loading__mark"
        fill="none"
        height="44"
        viewBox="0 0 80 44"
        width="80"
      >
        <title>/2</title>
        <path
          className="queue2-loading__stroke queue2-loading__stroke--slash"
          d="M29 6L14 38"
          pathLength="1"
        />
        <path
          className="queue2-loading__stroke queue2-loading__stroke--two"
          d="M42 14C45 7 61 7 64 15C67 24 51 26 43 37H68"
          pathLength="1"
        />
      </svg>
      {showText ? (
        <span
          style={{
            color: "var(--ink-muted)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.875rem",
            fontWeight: 800,
            letterSpacing: 0,
            textTransform: "uppercase"
          }}
        >
          {label}
        </span>
      ) : null}
      <style>
        {`
          .queue2-loading__stroke {
            animation: queue2-draw 1.45s cubic-bezier(.2,.75,.25,1) infinite;
            stroke: var(--primary);
            stroke-dasharray: 1;
            stroke-dashoffset: 1;
            stroke-linecap: square;
            stroke-linejoin: miter;
            stroke-width: 7;
          }

          .queue2-loading__stroke--two {
            animation-delay: .18s;
            stroke: color-mix(in oklch, var(--primary) 78%, var(--accent));
          }

          @keyframes queue2-draw {
            0% { stroke-dashoffset: 1; opacity: .55; }
            42% { stroke-dashoffset: 0; opacity: 1; }
            78% { stroke-dashoffset: 0; opacity: 1; }
            100% { stroke-dashoffset: -1; opacity: .55; }
          }

          @media (prefers-reduced-motion: reduce) {
            .queue2-loading__stroke {
              animation: none;
              stroke-dashoffset: 0;
            }
          }
        `}
      </style>
    </div>
  );
}
