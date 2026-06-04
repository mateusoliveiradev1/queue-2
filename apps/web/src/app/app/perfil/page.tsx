import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "../../../components/app-shell";
import { StatusToast } from "../../../components/status-toast";
import {
  buildDuoPath,
  getDuoDashboard,
  getDuoStatusMessage,
  profileUpdateResultToStatus,
  updateProfileDisplayName
} from "../../../modules/duo";
import {
  getVerifiedProfileAuthContext,
  hashSessionToken,
  logoutCurrentSessionAction,
  revokeSessionAction
} from "../../../platform/auth/session";

export const metadata: Metadata = {
  description:
    "Perfil individual no QUEUE/2 para revisar nome visivel e sessoes da conta.",
  title: "Perfil"
};

type ProfilePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps = {}) {
  const [{ activeSessions, currentSession }, params] = await Promise.all([
    getVerifiedProfileAuthContext(),
    searchParams
  ]);
  const dashboard = await getDuoDashboard(currentSession.user.id);

  if (dashboard.routeState === "pairing") {
    redirect("/parear");
  }

  if (dashboard.routeState === "naming") {
    redirect("/app/dupla?estado=dupla-formada");
  }

  const state = getSearchParam(params?.estado);
  const statusMessage =
    state === "sessao-revogada"
      ? "Sessao revogada quando ainda estava ativa."
      : getDuoStatusMessage(state);
  const currentSessionId = currentSession.session.id;

  return (
    <AppShell currentPage="perfil">
      <header className="app-header">
        <div>
          <p className="eyebrow">Perfil individual</p>
          <h1 className="page-title">Seu lugar na dupla</h1>
          <p className="lede">
            Ajuste como voce aparece para a outra pessoa e revise os acessos da
            conta. O progresso continua sendo dos dois.
          </p>
        </div>
      </header>

      {statusMessage ? (
        <>
          <StatusToast message={statusMessage} state={state} />
          <p className="status-banner" role="status">
            {statusMessage}
          </p>
        </>
      ) : null}

      <section className="surface-band app-section" aria-labelledby="display-name-section">
        <div className="section-heading">
          <h2 className="eyebrow" id="display-name-section">
            Nome visivel
          </h2>
          <p className="support-copy">O nome que aparece para sua dupla.</p>
        </div>
        <form action={updateProfileDisplayNameAction} className="form-stack">
          <div className="field">
            <label htmlFor="profile-display-name">Nome de exibicao</label>
            <input
              className="queue2-input"
              defaultValue={dashboard.profileDisplayName || currentSession.user.name}
              id="profile-display-name"
              maxLength={40}
              name="displayName"
              required
              type="text"
            />
          </div>
          <p className="support-copy">
            Use texto simples e curto. A fila nao precisa de apelido gigante.
          </p>
          <div className="form-actions">
            <button className="queue2-button" data-tone="primary" type="submit">
              Salvar nome
            </button>
          </div>
        </form>
      </section>

      <section className="surface-band app-section" aria-labelledby="sessions-section">
        <div className="section-heading">
          <h2 className="eyebrow" id="sessions-section">
            Acessos ativos
          </h2>
          <p className="support-copy">Revogue navegadores que voce nao usa mais.</p>
        </div>
        <ul className="session-list">
          {activeSessions.map((session) => {
            const isCurrentSession = session.id === currentSessionId;

            return (
              <li key={session.id}>
                <span>{isCurrentSession ? "Navegador atual" : "Outro acesso"}</span>
                <span className="muted">
                  {isCurrentSession
                    ? "Ativo agora"
                    : `Atualizada em ${formatSessionDate(session.updatedAt)}`}
                </span>
                {isCurrentSession ? null : (
                  <form action={revokeSessionAction}>
                    <input name="sessionId" type="hidden" value={session.id} />
                    <input
                      name="sessionFingerprint"
                      type="hidden"
                      value={hashSessionToken(session.token)}
                    />
                    <input
                      name="sessionUpdatedAt"
                      type="hidden"
                      value={session.updatedAt.toISOString()}
                    />
                    <button className="queue2-button" data-tone="quiet" type="submit">
                      Encerrar sessao
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="surface-band app-section" aria-labelledby="logout-section">
        <div className="section-heading">
          <h2 className="eyebrow" id="logout-section">
            Sair
          </h2>
          <p className="support-copy">Encerre apenas este navegador.</p>
        </div>
        <p className="support-copy">
          Voce volta para a tela de entrada. A dupla e a fila continuam guardadas.
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

async function updateProfileDisplayNameAction(formData: FormData) {
  "use server";

  const { currentSession } = await getVerifiedProfileAuthContext();
  const result = await updateProfileDisplayName({
    userId: currentSession.user.id,
    displayName: getFormString(formData, "displayName")
  });

  redirect(
    buildDuoPath("/app/perfil", {
      estado: profileUpdateResultToStatus(result)
    })
  );
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getSearchParam(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function formatSessionDate(value: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(value);
}
