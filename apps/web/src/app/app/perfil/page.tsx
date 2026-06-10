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
  const profileDisplayName =
    dashboard.profileDisplayName || currentSession.user.name || "Jogador da fila";
  const profileImageUrl = normalizeProfileImageUrl(currentSession.user.image);
  const profileInitials = getProfileInitials(profileDisplayName);

  return (
    <AppShell currentPage="perfil">
      <header className="utility-hero profile-hero">
        <div>
          <p className="eyebrow">Perfil individual</p>
          <h1 className="page-title">Seu lugar na dupla</h1>
          <p className="lede">
            Ajuste como voce aparece para a outra pessoa e revise os acessos da
            conta. O progresso continua sendo dos dois.
          </p>
        </div>
        <div className="profile-identity-card" aria-label="Identidade do perfil">
          <span className="profile-avatar-preview" aria-hidden="true">
            {profileImageUrl ? (
              <img
                alt=""
                decoding="async"
                loading="lazy"
                referrerPolicy="no-referrer"
                src={profileImageUrl}
              />
            ) : (
              profileInitials
            )}
          </span>
          <span>
            <small>aparece como</small>
            <strong>{profileDisplayName}</strong>
          </span>
          <span>
            <small>email</small>
            <strong>{currentSession.user.email}</strong>
          </span>
        </div>
        <div className="utility-stat-strip profile-stat-strip" aria-label="Resumo da conta">
          <span>
            <small>sessoes ativas</small>
            <strong>{activeSessions.length}</strong>
          </span>
          <span>
            <small>sessao atual</small>
            <strong>ativa</strong>
          </span>
          <span>
            <small>avatar</small>
            <strong>{profileImageUrl ? "salvo" : "iniciais"}</strong>
          </span>
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

      <section
        className="surface-band app-section profile-form-panel"
        aria-labelledby="profile-identity-section"
      >
        <div className="section-heading">
          <h2 className="eyebrow" id="profile-identity-section">
            Identidade visivel
          </h2>
          <p className="support-copy">
            O que a outra pessoa ve quando combina jogos, sessoes e conquistas.
          </p>
        </div>
        <form
          action={updateProfileDisplayNameAction}
          className="form-stack profile-form profile-avatar-url-safe"
        >
          <div className="field">
            <label htmlFor="profile-display-name">Nome de exibicao</label>
            <input
              className="queue2-input"
              defaultValue={profileDisplayName}
              id="profile-display-name"
              maxLength={40}
              name="displayName"
              required
              type="text"
            />
          </div>
          <div className="field">
            <label htmlFor="profile-avatar-url">URL do avatar</label>
            <input
              className="queue2-input"
              defaultValue={currentSession.user.image ?? ""}
              id="profile-avatar-url"
              inputMode="url"
              maxLength={500}
              name="avatarUrl"
              pattern="https://.*"
              placeholder="https://exemplo.com/avatar.png"
              type="url"
            />
          </div>
          <div className="profile-form-guidance">
            <p className="support-copy">
              Nome em texto simples, ate 40 caracteres. Avatar vazio volta para
              iniciais.
            </p>
            <p className="support-copy">
              Por seguranca, a imagem precisa usar https.
            </p>
          </div>
          <div className="form-actions">
            <button className="queue2-button" data-tone="primary" type="submit">
              Salvar perfil
            </button>
          </div>
        </form>
      </section>

      <section
        className="surface-band app-section profile-session-panel"
        aria-labelledby="sessions-section"
      >
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

      <section
        className="surface-band app-section profile-logout-panel"
        aria-labelledby="logout-section"
      >
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
    displayName: getFormString(formData, "displayName"),
    avatarUrl: getFormString(formData, "avatarUrl")
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

function normalizeProfileImageUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

function getProfileInitials(displayName: string): string {
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "Q2";
}

function formatSessionDate(value: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(value);
}
