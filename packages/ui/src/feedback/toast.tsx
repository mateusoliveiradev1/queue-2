"use client";

import type { ReactNode } from "react";
import { Toaster, toast } from "sonner";
import type { ExternalToast, ToasterProps } from "sonner";

import { RoulettePointer } from "../brand/mark";

export type QueueToastVariant = "calm" | "special";

export type QueueToastOptions = Omit<ExternalToast, "className" | "descriptionClassName"> & {
  description?: ReactNode;
  variant?: QueueToastVariant;
};

const variantLabels: Record<QueueToastVariant, string> = {
  calm: "Atualizacao da fila",
  special: "Momento da dupla"
};

function variantClass(variant: QueueToastVariant) {
  return `queue2-toast queue2-toast--${variant}`;
}

export function QueueToaster(props: ToasterProps) {
  return (
    <Toaster
      closeButton
      duration={4500}
      expand={false}
      gap={10}
      position="bottom-center"
      toastOptions={{
        className: "queue2-toast",
        descriptionClassName: "queue2-toast__description"
      }}
      {...props}
    />
  );
}

export function queueToast(message: ReactNode, options: QueueToastOptions = {}) {
  const { variant = "calm", description, ...toastOptions } = options;
  const icon =
    variant === "special" ? (
      <RoulettePointer aria-hidden="true" label="" tone="accent" />
    ) : (
      <RoulettePointer aria-hidden="true" label="" tone="primary" />
    );

  return toast(message, {
    className: variantClass(variant),
    description: description ?? variantLabels[variant],
    descriptionClassName: "queue2-toast__description",
    icon,
    ...toastOptions
  });
}

export function queueToastSuccess(message = "A fila virou nossa.", options: QueueToastOptions = {}) {
  return queueToast(message, {
    variant: "special",
    description: "Dupla formada. Agora cada escolha pertence aos dois.",
    ...options
  });
}

export function queueToastCalm(message: ReactNode, options: QueueToastOptions = {}) {
  return queueToast(message, {
    variant: "calm",
    ...options
  });
}

export { toast as sonnerToast };
