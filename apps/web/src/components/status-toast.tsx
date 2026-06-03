"use client";

import { useEffect, useRef } from "react";
import { queueToastCalm, queueToastSuccess } from "@queue/ui";

type StatusToastProps = {
  message: string | null;
  state: string | null;
  variant?: "calm" | "special";
};

export function StatusToast({
  message,
  state,
  variant = "calm"
}: StatusToastProps) {
  const shownKey = useRef("");

  useEffect(() => {
    if (!message || !state) {
      return;
    }

    const key = `${state}:${message}`;

    if (shownKey.current === key) {
      return;
    }

    shownKey.current = key;

    if (variant === "special") {
      queueToastSuccess(message);
      return;
    }

    queueToastCalm(message);
  }, [message, state, variant]);

  return null;
}
