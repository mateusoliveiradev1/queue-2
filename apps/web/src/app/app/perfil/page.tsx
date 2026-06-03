import type { Metadata } from "next";

import { AppShell } from "../../../components/app-shell";
import {
  getVerifiedProfileAuthContext,
  logoutCurrentSessionAction,
  revokeSessionAction
} from "../../../platform/auth/session";

export const metadata: Metadata = {
  title: "Perfil - QUEUE/2"
};

type ProfilePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps = {}) {
  const [{ activeSessions, currentSession }, params] = await Promise.all([
    getVerifiedProfileAuthContext(),
    searchParams
  ]);
  const state = getSearchParam(params?.estado);
  const currentSessionId = currentSession.session.id;

  return (
    <AppShell currentPage="perfil">
      <header className="app-header">
        <div>
          <p className="eyebrow">Perfil individual</p>
          <h1 className="page-title">Seu lugar na dupla</h1>
          <p className="lede">
            O perfil guarda a identidade de exibicao e os acessos ativos. O
            progresso continua sendo da dupla.
          </p>
        </div>
      </header>

      <section className="surface-band app-section" aria-labelledby="display-name-section">
        <h2 className="eyebrow" id="display-name-section">
          Nome de exibicao
        </h2>
        <div className="field">
          <label htmlFor="profile-display-name">Nome de exibicao</label>
          <input
            className="queue2-input"
            disabled
            id="profile-display-name"
            maxLength={40}
            name="displayName"
            readOnly
            type="text"
            value={currentSession.user.name}
          />
        </div>
        <p className="support-copy">
          Nomes ficam curtos, em texto simples e sem formatacao.
        </p>
      </section>

      <section className="surface-band app-section" aria-labelledby="sessions-section">
        <h2 className="eyebrow" id="sessions-section">
          Sessoes ativas
        </h2>
        {state === "sessao-revogada" ? (
          <p className="neutral-state" role="status">
            Sessao revogada quando ainda estava ativa.
          </p>
        ) : null}
        <ul className="session-list">
          {activeSessions.map((session) => {
            const isCurrentSession = session.id === currentSessionId;

            return (
              <li key={session.id}>
                <span>{isCurrentSession ? "Navegador atual" : "Sessao ativa"}</span>
                <span className="muted">
                  {isCurrentSession ? "Ativo agora" : `Atualizada em ${formatSessionDate(session.updatedAt)}`}
                </span>
                {isCurrentSession ? null : (
                  <form action={revokeSessionAction}>
                    <input name="sessionId" type="hidden" value={session.id} />
                    <button className="queue2-button" data-tone="quiet" type="submit">
                      Revogar
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="surface-band app-section" aria-labelledby="logout-section">
        <h2 className="eyebrow" id="logout-section">
          Sair
        </h2>
        <p className="support-copy">
          Encerre o acesso atual e volte para a tela de entrada.
        </p>
        <form action={logoutCurrentSessionAction}>
          <button className="queue2-button" data-tone="quiet" type="submit">
            Sair da conta
          </button>
        </form>
      </section>
    </AppShell>
  );
}

function getSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function formatSessionDate(value: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(value);
}
