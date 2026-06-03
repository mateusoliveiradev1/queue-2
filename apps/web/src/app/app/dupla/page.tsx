import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "../../../components/app-shell";
import { TimezoneInput } from "../../../components/timezone-input";
import {
  buildDuoPath,
  duoUpdateResultToStatus,
  formatPairingDate,
  getDuoDashboard,
  getDuoStatusMessage,
  updateDuoSettings
} from "../../../modules/duo";
import { requireVerifiedSession } from "../../../platform/auth/session";

export const metadata: Metadata = {
  title: "Dupla - QUEUE/2"
};

type DuoPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DuoPage({ searchParams }: DuoPageProps = {}) {
  const session = await requireVerifiedSession();
  const [dashboard, params] = await Promise.all([
    getDuoDashboard(session.user.id),
    searchParams
  ]);

  if (dashboard.routeState === "pairing" || !dashboard.duo) {
    redirect("/parear");
  }

  const duo = dashboard.duo;
  const statusMessage = getDuoStatusMessage(getSearchParam(params?.estado));

  return (
    <AppShell currentPage="dupla">
      <header className="app-header">
        <div>
          <p className="eyebrow">Identidade compartilhada</p>
          <h1 className="page-title">{duo.name ?? "A fila e nossa"}</h1>
          <p className="lede">
            Os dois membros podem cuidar do nome, do fuso e das preferencias.
            Nao existe dono da dupla.
          </p>
        </div>
      </header>

      {statusMessage ? (
        <p className="status-banner" role="status">
          {statusMessage}
        </p>
      ) : null}

      <form action={updateDuoSettingsAction} className="surface-band app-section">
        <section aria-labelledby="duo-name-section" className="form-stack">
          <h2 className="eyebrow" id="duo-name-section">
            Nome da dupla
          </h2>
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
            Nome curto, em texto simples e sem HTML ou formatacao.
          </p>
        </section>

        <section aria-labelledby="timezone-section" className="form-stack">
          <h2 className="eyebrow" id="timezone-section">
            Timezone
          </h2>
          <TimezoneInput defaultValue={duo.timezone} />
          <p className="support-copy">
            Confirme o fuso usado por resets, streaks e sessoes futuras.
          </p>
        </section>

        <section aria-labelledby="preferences-section" className="form-stack">
          <h2 className="eyebrow" id="preferences-section">
            Preferencias compartilhadas
          </h2>
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
              Audio de celebracao
            </label>
          </div>
          <p className="support-copy">
            Push so sera pedido depois de uma acao que explique valor concreto.
          </p>
        </section>

        <div className="form-actions">
          <button className="queue2-button" data-tone="primary" type="submit">
            Salvar dupla
          </button>
        </div>
      </form>

      <section className="surface-band app-section" aria-labelledby="members-section">
        <h2 className="eyebrow" id="members-section">
          Membros
        </h2>
        <div className="settings-grid">
          {duo.members.map((member) => (
            <div className="metric" key={member.userId}>
              <span className="muted">Jogador {member.memberSlot}</span>
              <strong>{member.displayName}</strong>
              <span className="muted">Membro fixo da fila compartilhada.</span>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-band app-section" aria-labelledby="pairing-date-section">
        <h2 className="eyebrow" id="pairing-date-section">
          Data de pareamento
        </h2>
        <p className="lede">
          {duo.pairedAt
            ? formatPairingDate(duo.pairedAt, duo.timezone)
            : "Aguardando a segunda pessoa entrar pelo codigo."}
        </p>
      </section>
    </AppShell>
  );
}

async function updateDuoSettingsAction(formData: FormData) {
  "use server";

  const session = await requireVerifiedSession();
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
