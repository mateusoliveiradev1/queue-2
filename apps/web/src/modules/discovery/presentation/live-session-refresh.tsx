"use client";

import { useEffect, useMemo, useState } from "react";

import type { DiscoveryLiveSessionPayload } from "../application/ports";

type LiveRefreshMatch = {
  match: {
    id: string;
  };
  title: string;
  slug: string;
};

type LiveRefreshState =
  | {
      ok: true;
      sessionId: string;
      status: "active" | "ended" | "expired";
      expiresInSeconds: number;
      matches: LiveRefreshMatch[];
    }
  | {
      ok: false;
      reason: "membership-required" | "live-session-not-found";
    }
  | null;

const LIVE_POLL_INTERVAL_MS = 4_000;

export function LiveSessionRefresh({
  initialLiveSession
}: {
  initialLiveSession: DiscoveryLiveSessionPayload | null;
}) {
  const initialState = useMemo(
    () => toLiveRefreshState(initialLiveSession),
    [initialLiveSession]
  );
  const [state, setState] = useState<LiveRefreshState>(initialState);
  const shouldPoll =
    state?.ok === true &&
    state.status === "active" &&
    state.expiresInSeconds > 0;

  useEffect(() => {
    setState(initialState);
  }, [initialState]);

  useEffect(() => {
    if (!shouldPoll || state?.ok !== true) {
      return;
    }

    const sessionId = state.sessionId;
    const intervalId = window.setInterval(async () => {
      const response = await fetch(`/api/discovery/live/${sessionId}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as LiveRefreshState;

      if (!response.ok || payload?.ok !== true) {
        setState({ ok: false, reason: "live-session-not-found" });
        return;
      }

      setState(payload);
    }, LIVE_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [shouldPoll, state]);

  if (!state) {
    return null;
  }

  if (!state.ok) {
    return (
      <p className="live-refresh-status discovery-orbit-status" role="status">
        Live encerrada ou indisponivel para esta dupla.
      </p>
    );
  }

  const latestMatch = state.matches[0] ?? null;

  return (
    <div className="live-refresh discovery-orbit-status" aria-live="polite">
      {latestMatch ? (
        <div className="live-refresh-celebration" role="status">
          <p className="eyebrow">Match Live detectou</p>
          <h3>{latestMatch.title}</h3>
          <a className="text-link" href={`/app/jogo/${latestMatch.slug}`}>
            Abrir detalhe
          </a>
        </div>
      ) : (
        <p className="live-refresh-status" role="status">
          Atualizando a live a cada poucos segundos enquanto ela estiver ativa.
        </p>
      )}
    </div>
  );
}

function toLiveRefreshState(
  payload: DiscoveryLiveSessionPayload | null
): LiveRefreshState {
  if (!payload) {
    return null;
  }

  if (!payload.ok) {
    return {
      ok: false,
      reason: payload.reason
    };
  }

  return {
    ok: true,
    sessionId: payload.session.id,
    status: payload.session.status,
    expiresInSeconds: payload.expiresInSeconds,
    matches: payload.matches.map((item) => ({
      match: {
        id: item.match.id
      },
      title: item.title,
      slug: item.slug
    }))
  };
}
