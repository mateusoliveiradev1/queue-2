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

export function PushOptInButton() {
  const [state, setState] = useState<PushState>("idle");
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setSupported(isPushSupported());
  }, []);

  async function handleEnablePush() {
    if (!supported) {
      setState("unsupported");
      return;
    }

    setState("enabling");
    try {
      const configResponse = await fetch("/api/discovery/push", {
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

      const registration = await navigator.serviceWorker.register(
        "/discovery-push-sw.js"
      );
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey)
      });
      const response = await fetch("/api/discovery/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
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
      const registration = await navigator.serviceWorker.getRegistration(
        "/discovery-push-sw.js"
      );
      const subscription = await registration?.pushManager.getSubscription();

      if (!subscription) {
        setState("disabled");
        return;
      }

      const endpoint = subscription.endpoint;
      const response = await fetch("/api/discovery/push", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ endpoint })
      });

      if (response.ok) {
        await subscription.unsubscribe();
        setState("disabled");
        return;
      }

      setState("failed");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="push-opt-in" aria-live="polite">
      <button
        className="queue2-button"
        data-tone="quiet"
        disabled={supported !== true || state === "enabling"}
        onClick={handleEnablePush}
        type="button"
      >
        {state === "enabling" ? "Ativando alertas..." : "Ativar alertas push"}
      </button>
      <button
        className="text-button"
        disabled={supported !== true || state === "disabling"}
        onClick={handleDisablePush}
        type="button"
      >
        Desativar neste navegador
      </button>
      <p className="support-copy">{formatPushState(state, supported)}</p>
    </div>
  );
}

function formatPushState(state: PushState, supported: boolean | null): string {
  if (supported === false || state === "unsupported") {
    return "Alertas push nao estao disponiveis neste navegador.";
  }

  switch (state) {
    case "enabled":
      return "Alertas de Match Live ativados para este navegador.";
    case "disabled":
      return "Alertas desativados neste navegador.";
    case "denied":
      return "Permissao negada pelo navegador.";
    case "not-configured":
      return "Alertas push ainda nao foram configurados no servidor.";
    case "failed":
      return "Nao foi possivel atualizar os alertas agora.";
    default:
      return "Opcional: receba aviso quando a dupla formar um match live.";
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
