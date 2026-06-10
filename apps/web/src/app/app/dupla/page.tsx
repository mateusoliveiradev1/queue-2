import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "../../../components/app-shell";
import { StatusToast } from "../../../components/status-toast";
import { TimezoneInput } from "../../../components/timezone-input";
import {
  buildDuoPath,
  duoUpdateResultToStatus,
  formatPairingDate,
  getDuoDashboard,
  getDuoStatusMessage,
  updateDuoSettings
} from "../../../modules/duo";
import {
  getDuoNotifications,
  NotificationCenter,
  PushPreferences
} from "../../../modules/play";
import {
  requireAuthoritativeVerifiedSession,
  requireVerifiedSession
} from "../../../platform/auth/session";

export const metadata: Metadata = {
  description:
    "Configuracoes da dupla fixa no QUEUE/2: nome, fuso, membros e preferencias compartilhadas.",
  title: "Dupla"
};

type DuoPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DuoPage({ searchParams }: DuoPageProps = {}) {
  const session = await requireVerifiedSession();
  const [dashboard, params, notificationsResult] = await Promise.all([
    getDuoDashboard(session.user.id),
    searchParams,
    getDuoNotifications({ userId: session.user.id })
  ]);

  if (dashboard.routeState === "pairing" || !dashboard.duo) {
    redirect("/parear");
  }

  const duo = dashboard.duo;
  const statusMessage = getDuoStatusMessage(getSearchParam(params?.estado));
  const pairedAtLabel = duo.pairedAt
    ? formatPairingDate(duo.pairedAt, duo.timezone)
    : "Aguardando a segunda pessoa entrar pelo codigo.";
  const enabledPreferenceCount = [duo.notificationsEnabled, duo.audioEnabled].filter(Boolean).length;

  return (
    <AppShell
      currentPage="dupla"
      notificationCenter={
        <NotificationCenter center={notificationsResult.ok ? notificationsResult.center : null} />
      }
    >
      <header className="utility-hero duo-hero">
        <div>
          <p className="eyebrow">Contrato /2</p>
          <h1 className="page-title">{duo.name ?? "A fila e nossa"}</h1>
          <p className="lede">
            Nome, fuso e preferencias pertencem aos dois. A dupla nao tem dono
            unico.
          </p>
        </div>
        <div className="duo-contract-card" aria-label="Contrato da dupla">
          <span>contrato /2</span>
          <strong>{duo.members.length}/2</strong>
          <small>Dupla fechada. Convites e codigos ficam no pareamento.</small>
        </div>
        <div className="utility-stat-strip duo-stats" aria-label="Stats coletivos da dupla">
          <span>
            <small>membros</small>
            <strong>{duo.members.length}/2</strong>
          </span>
          <span>
            <small>fuso</small>
            <strong>{duo.timezone}</strong>
          </span>
          <span>
            <small>preferencias</small>
            <strong>{enabledPreferenceCount}/2</strong>
          </span>
        </div>
      </header>

      {statusMessage ? (
        <>
          <StatusToast
            message={statusMessage}
            state={getSearchParam(params?.estado)}
            variant={getSearchParam(params?.estado) === "dupla-formada" ? "special" : "calm"}
          />
          <p className="status-banner" role="status">
            {statusMessage}
          </p>
        </>
      ) : null}

      <form action={updateDuoSettingsAction} className="surface-band app-section duo-settings-form">
        <section aria-labelledby="duo-name-section" className="form-stack">
          <div className="section-heading">
            <h2 className="eyebrow" id="duo-name-section">
              Nome da dupla
            </h2>
            <p className="support-copy">Esse nome aparece no painel e nas futuras celebracoes.</p>
          </div>
          <div className="field">
            <label htmlFor="duo-name">Nome da dupla</label>
            <input
              className="queue2-input"
              defaultValue={duo.name ?? ""}
              id="duo-name"
              maxLength={48}
              name="duoName"
              required
              type="text"
            />
          </div>
          <p className="support-copy">
            Use texto simples. Curto o bastante para caber nos placares da dupla.
          </p>
        </section>

        <section aria-labelledby="timezone-section" className="form-stack">
          <div className="section-heading">
            <h2 className="eyebrow" id="timezone-section">
              Fuso da dupla
            </h2>
            <p className="support-copy">Uma referencia unica para horarios combinados.</p>
          </div>
          <TimezoneInput defaultValue={duo.timezone} />
          <p className="support-copy">
            Resets, streaks e sessoes futuras seguem este horario.
          </p>
        </section>

        <section aria-labelledby="preferences-section" className="form-stack">
          <div className="section-heading">
            <h2 className="eyebrow" id="preferences-section">
              Preferencias da dupla
            </h2>
            <p className="support-copy">Ajustes que mudam a experiencia dos dois.</p>
          </div>
          <div className="settings-grid">
            <label className="neutral-state preference-control" htmlFor="pref-notifications">
              <input
                defaultChecked={duo.notificationsEnabled}
                id="pref-notifications"
                name="notifications"
                type="checkbox"
              />
              Notificacoes calmas
            </label>
            <label className="neutral-state preference-control" htmlFor="pref-audio">
              <input
                defaultChecked={duo.audioEnabled}
                id="pref-audio"
                name="audio"
                type="checkbox"
              />
              Som nas celebracoes
            </label>
          </div>
          <p className="support-copy">
            A permissao de push so aparece quando houver um lembrete real.
          </p>
          <PushPreferences />
        </section>

        <div className="form-actions">
          <button className="queue2-button" data-tone="primary" type="submit">
            Salvar dupla
          </button>
        </div>
      </form>

      <section className="surface-band app-section duo-members-panel" aria-labelledby="members-section">
        <div className="section-heading">
          <h2 className="eyebrow" id="members-section">
            Membros fixos
          </h2>
          <p className="support-copy">/2 significa que a fila fecha aqui.</p>
        </div>
        <div className="duo-member-grid">
          {duo.members.map((member) => (
            <article className="duo-member-card" key={member.userId}>
              <span className="duo-avatar" aria-hidden="true">
                {getMemberInitials(member.displayName)}
              </span>
              <div>
                <span className="muted">Jogador {member.memberSlot}</span>
                <strong>{member.displayName}</strong>
              </div>
              <span className="muted">Membro fixo da fila compartilhada.</span>
            </article>
          ))}
        </div>
      </section>

      <section className="surface-band app-section" aria-labelledby="pairing-date-section">
        <div className="section-heading">
          <h2 className="eyebrow" id="pairing-date-section">
            Desde quando
          </h2>
          <p className="support-copy">O marco inicial da fila compartilhada.</p>
        </div>
        <p className="lede">{pairedAtLabel}</p>
      </section>
    </AppShell>
  );
}

async function updateDuoSettingsAction(formData: FormData) {
  "use server";

  const session = await requireAuthoritativeVerifiedSession();
  const result = await updateDuoSettings({
    userId: session.user.id,
    name: getFormString(formData, "duoName"),
    timezone: getFormString(formData, "timezone"),
    notificationsEnabled: formData.get("notifications") === "on",
    audioEnabled: formData.get("audio") === "on"
  });

  if (!result.ok && result.state === "not-paired") {
    redirect("/parear");
  }

  redirect(
    buildDuoPath("/app/dupla", {
      estado: duoUpdateResultToStatus(result)
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

function getMemberInitials(displayName: string): string {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "/2";
}
