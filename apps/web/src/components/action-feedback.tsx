"use client";

import type { ButtonHTMLAttributes } from "react";

export type ActionFeedbackState =
  | "idle"
  | "syncing"
  | "confirmed"
  | "failed"
  | "retrying";

type ActionFeedbackCopy = Partial<Record<ActionFeedbackState, string>>;

type ActionFeedbackProps = {
  state: ActionFeedbackState;
  copy?: ActionFeedbackCopy;
  id?: string;
  className?: string;
};

type ActionFeedbackButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  state: ActionFeedbackState;
  labels: {
    idle: string;
    syncing: string;
    confirmed: string;
    failed: string;
    retrying?: string;
  };
  tone?: "primary" | "quiet";
};

const defaultCopy: Record<ActionFeedbackState, string> = {
  idle: "",
  syncing: "Salvo aqui, sincronizando...",
  confirmed: "Confirmado pela fila.",
  failed: "Nao sincronizou. Tente de novo.",
  retrying: "Tentando de novo..."
};

export function ActionFeedback({
  state,
  copy,
  id,
  className
}: ActionFeedbackProps) {
  const isIdle = state === "idle";
  const message = getActionFeedbackCopy(state, copy);
  const classNames = ["action-feedback", className].filter(Boolean).join(" ");

  return (
    <div
      aria-atomic={isIdle ? undefined : "true"}
      aria-live={isIdle ? undefined : state === "failed" ? "assertive" : "polite"}
      className={classNames}
      data-state={state}
      id={id}
      role={isIdle ? undefined : "status"}
    >
      <span aria-hidden="true" className="action-feedback__mark">
        /2
      </span>
      <span className="action-feedback__copy">
        {isIdle ? "\u00a0" : message}
      </span>
    </div>
  );
}

export function ActionFeedbackButton({
  state,
  labels,
  tone = "primary",
  className,
  disabled,
  ...buttonProps
}: ActionFeedbackButtonProps) {
  const isPending = state === "syncing" || state === "retrying";
  const isTerminalSuccess = state === "confirmed";
  const label = getActionButtonLabel(state, labels);
  const ariaLabel =
    state === "idle" || labels.idle === label ? label : `${labels.idle}: ${label}`;
  const classNames = ["queue2-button", "action-feedback-button", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...buttonProps}
      aria-busy={isPending}
      aria-label={buttonProps["aria-label"] ?? ariaLabel}
      className={classNames}
      data-action-state={state}
      data-tone={tone}
      disabled={disabled || isPending || isTerminalSuccess}
      type={buttonProps.type ?? "submit"}
    >
      <span aria-hidden="true" className="action-feedback-button__mark">
        /2
      </span>
      <span className="action-feedback-button__label">
        {label}
      </span>
    </button>
  );
}

export function getActionFeedbackCopy(
  state: ActionFeedbackState,
  copy: ActionFeedbackCopy = {}
): string {
  return copy[state] ?? defaultCopy[state];
}

function getActionButtonLabel(
  state: ActionFeedbackState,
  labels: ActionFeedbackButtonProps["labels"]
): string {
  if (state === "retrying") {
    return labels.retrying ?? labels.syncing;
  }

  return labels[state];
}
