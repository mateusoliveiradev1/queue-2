"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_REFRESH_INTERVAL_MS = 3000;

type PairingAutoRefreshProps = {
  intervalMs?: number;
};

export function PairingAutoRefresh({
  intervalMs = DEFAULT_REFRESH_INTERVAL_MS
}: PairingAutoRefreshProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const refreshPairingState = () => {
      startTransition(() => {
        router.refresh();
      });
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refreshPairingState();
      }
    };
    const initialCheck = window.setTimeout(refreshPairingState, 1000);
    const interval = window.setInterval(refreshPairingState, intervalMs);

    window.addEventListener("focus", refreshPairingState);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshPairingState);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [intervalMs, router]);

  return (
    <span>
      {isPending
        ? "Verificando se a dupla fechou..."
        : "Aguardando a segunda pessoa. A tela atualiza sozinha."}
    </span>
  );
}
