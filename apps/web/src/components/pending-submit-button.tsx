"use client";

import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = {
  label: string;
  pendingLabel: string;
  tone?: "primary" | "quiet";
  disabled?: boolean;
};

export function PendingSubmitButton({
  label,
  pendingLabel,
  tone = "primary",
  disabled = false
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      aria-busy={pending}
      className="queue2-button pending-submit-button"
      data-pending={pending ? "true" : "false"}
      data-tone={tone}
      disabled={isDisabled}
      type="submit"
    >
      <span aria-hidden="true" className="pending-submit-button__spinner" />
      <span>{pending ? pendingLabel : label}</span>
    </button>
  );
}
