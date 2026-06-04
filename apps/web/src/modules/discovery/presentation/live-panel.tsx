import type { DiscoveryLiveSessionPayload } from "../application/ports";
import { LiveSessionRefresh } from "./live-session-refresh";
import { PushOptInButton } from "./push-opt-in-button";

type LiveAction = (formData: FormData) => Promise<void>;

export function LivePanel({
  action,
  liveSession,
  returnTo
}: {
  action: LiveAction;
  liveSession: DiscoveryLiveSessionPayload | null;
  returnTo: string;
}) {
  const isActive = liveSession?.ok === true;

  return (
    <section className="live-panel discovery-orbit-tray" aria-labelledby="live-summary-title">
      <div className="section-heading">
        <h2 className="eyebrow" id="live-summary-title">
          Live
        </h2>
        <p className="support-copy">{formatLiveSummary(liveSession)}</p>
      </div>
      {isActive ? (
        <p className="live-panel-active" role="status">
          Live ativa. Decidam cartas ao mesmo tempo; quando os dois marcam
          Quero jogar no mesmo jogo, o match aparece aqui.
        </p>
      ) : (
        <form action={action} className="live-panel-action">
          <input name="returnTo" type="hidden" value={returnTo} />
          <button className="queue2-button" data-tone="primary" type="submit">
            Comecar live de 10 min
          </button>
        </form>
      )}
      <LiveSessionRefresh initialLiveSession={isActive ? liveSession : null} />
      {isActive ? <PushOptInButton /> : null}
    </section>
  );
}

function formatLiveSummary(liveSession: DiscoveryLiveSessionPayload | null): string {
  if (!liveSession) {
    return "Sessao curta para os dois descobrirem ao mesmo tempo, sem chat ou pressao.";
  }

  if (!liveSession.ok) {
    return "Nenhuma sessao live ativa foi encontrada para esta dupla.";
  }

  const minutes = Math.max(1, Math.ceil(liveSession.expiresInSeconds / 60));
  return `${liveSession.matches.length} match(es) nesta live. Expira em cerca de ${minutes} min.`;
}
