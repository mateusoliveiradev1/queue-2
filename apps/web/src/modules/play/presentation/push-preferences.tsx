"use client";

import { useEffect, useState } from "react";

type PushState =
  | "idle"
  | "enabling"
  | "enabled"
  | "disabling"
  | "disabled"
  | "unsupported"
  | "denied"
  | "not-configured"
  | "failed";

export function PushPreferences() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<PushState>("idle");
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setSupported(isPushSupported());
    setMounted(true);
  }, []);

  async function handleEnablePush() {
    if (!supported) {
      setState("unsupported");
      return;
    }

    setState("enabling");
    try {
      const configResponse = await fetch("/api/play/notifications", {
        cache: "no-store"
      });
      const config = (await configResponse.json()) as
        | {
            ok: true;
            publicKey: string;
          }
        | {
            ok: false;
            reason: string;
          };

      if (!config.ok) {
        setState(config.reason === "push-not-configured" ? "not-configured" : "failed");
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setState("denied");
        return;
      }

      const registration = await navigator.serviceWorker.register("/product-push-sw.js");
      const subscription = await registration.pushManager.subscribe({
        applicationServerKey: urlBase64ToUint8Array(config.publicKey),
        userVisibleOnly: true
      });
      const response = await fetch("/api/play/notifications", {
        body: JSON.stringify({
          subscription: subscription.toJSON()
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });

      setState(response.ok ? "enabled" : "failed");
    } catch {
      setState("failed");
    }
  }

  async function handleDisablePush() {
    if (!supported) {
      setState("unsupported");
      return;
    }

    setState("disabling");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/product-push-sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      const endpoint = subscription?.endpoint ?? null;
      const response = await fetch("/api/play/notifications", {
        body: JSON.stringify({ endpoint }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "DELETE"
      });

      if (response.ok) {
        await subscription?.unsubscribe();
        setState("disabled");
        return;
      }

      setState("failed");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="push-preferences" aria-live="polite">
      <div className="form-actions">
        <button
          className="queue2-button"
          data-tone="quiet"
          disabled={!mounted || supported !== true || state === "enabling"}
          onClick={handleEnablePush}
          type="button"
        >
          {state === "enabling" ? "Ativando lembretes..." : "Ativar push de sessoes"}
        </button>
        <button
          className="text-button"
          disabled={!mounted || supported !== true || state === "disabling"}
          onClick={handleDisablePush}
          type="button"
        >
          Desativar neste navegador
        </button>
      </div>
      <p className="support-copy">{formatPushState(state, supported, mounted)}</p>
    </div>
  );
}

function formatPushState(
  state: PushState,
  supported: boolean | null,
  mounted: boolean
): string {
  if (!mounted) {
    return "Verificando suporte a push neste navegador.";
  }

  if (supported === false || state === "unsupported") {
    return "Push nao esta disponivel neste navegador.";
  }

  switch (state) {
    case "enabled":
      return "Push de sessoes ativado para este navegador.";
    case "disabled":
      return "Push desativado neste navegador. Agenda e Central continuam funcionando.";
    case "denied":
      return "Permissao negada pelo navegador.";
    case "not-configured":
      return "Push ainda nao foi configurado no servidor.";
    case "failed":
      return "Nao foi possivel atualizar push agora.";
    default:
      return "Opcional depois de combinar uma sessao: receber lembretes fora da aba.";
  }
}

function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replaceAll("-", "+").replaceAll("_", "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));

  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }

  return output;
}
