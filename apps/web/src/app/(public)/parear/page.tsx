import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoulettePointer } from "@queue/ui";

import { CopyPairingCode } from "../../../components/copy-pairing-code";
import { PairingAutoRefresh } from "../../../components/pairing-auto-refresh";
import { PendingSubmitButton } from "../../../components/pending-submit-button";
import { PublicBrandLink } from "../../../components/public-brand-link";
import { PublicRitualStrip } from "../../../components/public-ritual-strip";
import { StatusToast } from "../../../components/status-toast";
import { TimezoneInput } from "../../../components/timezone-input";
import {
  buildDuoPath,
  createPairingCode,
  formatPairingCodeExpiry,
  getDuoDashboard,
  getDuoStatusMessage,
  joinDuo,
  joinResultToStatus,
  revokePairingCode
} from "../../../modules/duo";
import {
  requireAuthoritativeVerifiedSession,
  requireVerifiedSession
} from "../../../platform/auth/session";
import { recordSecurityAuditEvent } from "../../../platform/security/audit";

export const metadata: Metadata = {
  description:
    "Feche uma dupla fixa no QUEUE/2 com convite temporario e backlog compartilhado.",
  title: "Fechar dupla"
};

type PairingPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PairingPage({ searchParams }: PairingPageProps = {}) {
  const session = await requireVerifiedSession();
  const [dashboard, params] = await Promise.all([
    getDuoDashboard(session.user.id),
    searchParams
  ]);

  if (dashboard.routeState === "ready") {
    redirect("/app");
  }

  if (dashboard.routeState === "naming") {
    redirect(buildDuoPath("/app/dupla", { estado: "dupla-formada" }));
  }

  const mode = getSearchParam(params?.modo) === "entrar" ? "entrar" : "criar";
  const attemptsRemaining = parseOptionalNumber(getSearchParam(params?.restantes));
  const statusMessage = getDuoStatusMessage(
    getSearchParam(params?.estado),
    attemptsRemaining
  );
  const activeCode = dashboard.activePairingCode;
  const isAwaitingPartner = Boolean(dashboard.duo);
  const timezone = dashboard.duo?.timezone ?? "America/Sao_Paulo";

  return (
    <main className="public-shell">
      <section className="public-grid" aria-labelledby="pair-title">
        <div className="public-intro queue2-grain">
          <PublicBrandLink variant="stacked" />
          <div>
            <p className="eyebrow">/2 e regra do jogo</p>
            <h1 className="page-title" id="pair-title">
              Fechar a dupla
            </h1>
            <p className="lede">
              Crie um codigo para a outra pessoa ou use o convite que ela mandou.
              QUEUE/2 so comeca quando a fila fecha em 2/2.
            </p>
          </div>
          <PublicRitualStrip steps={["convite", "2/2", "fila"]} />
          <div className="neutral-state">
            <RoulettePointer aria-hidden="true" label="" tone="accent" />
            <span>Sem terceiro lugar: exatamente dois jogadores.</span>
          </div>
        </div>

        <section className="auth-panel" aria-label="Pareamento por codigo">
          <PublicBrandLink display="mark" />
          <StatusToast message={statusMessage} state={getSearchParam(params?.estado)} />
          <div className="auth-panel-header">
            <h2>{mode === "criar" ? "Criar convite" : "Usar convite"}</h2>
            <p>Um codigo ativo forma a dupla; convites expirados nao revelam dados.</p>
          </div>
          <div className="pairing-tabs" role="tablist" aria-label="Modo de pareamento">
            <a
              aria-selected={mode === "criar"}
              className="queue2-button"
              data-tone={mode === "criar" ? "primary" : "quiet"}
              href="/parear?modo=criar"
              role="tab"
            >
              Criar dupla
            </a>
            <a
              aria-selected={mode === "entrar"}
              className="queue2-button"
              data-tone={mode === "entrar" ? "primary" : "quiet"}
              href="/parear?modo=entrar"
              role="tab"
            >
              Entrar com codigo
            </a>
          </div>

          {statusMessage ? (
            <p className="status-banner" role="status">
              {statusMessage}
            </p>
          ) : null}

          {mode === "criar" ? (
            <CreateCodePanel
              activeCode={activeCode}
              timezone={timezone}
            />
          ) : (
            <JoinCodePanel disabled={isAwaitingPartner} />
          )}
        </section>
      </section>
    </main>
  );
}

function CreateCodePanel({
  activeCode,
  timezone
}: {
  activeCode: Awaited<ReturnType<typeof getDuoDashboard>>["activePairingCode"];
  timezone: string;
}) {
  if (activeCode) {
    return (
      <div className="form-stack">
        <p className="support-copy">
          Envie este codigo para a outra pessoa. O convite vale por 24 horas e pode
          ser revogado antes do uso.
        </p>
        <output
          className="pairing-code"
          aria-label={`Codigo de pareamento ${activeCode.code}`}
        >
          {activeCode.code}
        </output>
        <CopyPairingCode code={activeCode.code} />
        <p className="support-copy">
          Validade: {formatPairingCodeExpiry(activeCode.expiresAt, timezone)}.
        </p>
        <form action={revokePairingCodeAction}>
          <input name="pairingCodeId" type="hidden" value={activeCode.id} />
          <PendingSubmitButton
            label="Revogar convite"
            pendingLabel="Revogando..."
            tone="quiet"
          />
        </form>
        <div className="neutral-state" role="status">
          <RoulettePointer aria-hidden="true" label="" />
          <PairingAutoRefresh />
        </div>
      </div>
    );
  }

  return (
    <form action={createPairingCodeAction} className="form-stack">
      <p className="support-copy">
        Gere seis caracteres para a pessoa que vai dividir cada escolha com voce.
      </p>
      <TimezoneInput defaultValue={timezone} detectOnMount />
      <p className="support-copy">
        Confirme o fuso da dupla. Combinados futuros usam esse horario.
      </p>
      <PendingSubmitButton
        label="Criar codigo da dupla"
        pendingLabel="Criando codigo..."
      />
    </form>
  );
}

function JoinCodePanel({ disabled }: { disabled: boolean }) {
  if (disabled) {
    return (
      <div className="neutral-state" role="status">
        <RoulettePointer aria-hidden="true" label="" tone="accent" />
        <span>
          Voce ja iniciou uma dupla. No QUEUE/2, a fila pertence a dois jogadores
          fixos.
        </span>
      </div>
    );
  }

  return (
    <form action={joinDuoAction} className="form-stack">
      <div className="field">
        <label htmlFor="pairing-code">Codigo da dupla</label>
        <input
          autoComplete="one-time-code"
          className="queue2-input pairing-code-input"
          id="pairing-code"
          inputMode="text"
          maxLength={8}
          name="pairingCode"
          pattern="[A-Za-z0-9 -]{6,8}"
          required
          type="text"
        />
      </div>
      <PendingSubmitButton
        label="Entrar com codigo"
        pendingLabel="Entrando..."
      />
      <p className="support-copy">
        Se o codigo estiver ativo, a dupla fecha na hora.
      </p>
    </form>
  );
}

async function createPairingCodeAction(formData: FormData) {
  "use server";

  const session = await requireAuthoritativeVerifiedSession();
  const result = await createPairingCode({
    userId: session.user.id,
    displayName: session.user.name,
    timezone: getFormString(formData, "timezone")
  });

  if (!result.ok) {
    if (result.state === "invalid-timezone") {
      redirect(buildDuoPath("/parear", { estado: "timezone-invalido", modo: "criar" }));
    }

    redirect(buildDuoPath("/app", { estado: "ja-pareado" }));
  }

  redirect(buildDuoPath("/parear", { estado: "codigo-criado", modo: "criar" }));
}

async function revokePairingCodeAction(formData: FormData) {
  "use server";

  const session = await requireAuthoritativeVerifiedSession();
  const result = await revokePairingCode({
    userId: session.user.id,
    pairingCodeId: getFormString(formData, "pairingCodeId")
  });

  redirect(
    buildDuoPath("/parear", {
      estado: result.ok ? "codigo-revogado" : "codigo-inativo",
      modo: "criar"
    })
  );
}

async function joinDuoAction(formData: FormData) {
  "use server";

  const session = await requireAuthoritativeVerifiedSession();
  const result = await joinDuo({
    userId: session.user.id,
    displayName: session.user.name,
    code: getFormString(formData, "pairingCode")
  });
  const status = joinResultToStatus(result);

  recordSecurityAuditEvent({
    action: "duo.pairing_attempt",
    actorUserId: session.user.id,
    outcome: result.ok ? "paired" : result.state,
    attemptsRemaining: result.ok ? undefined : result.attemptsRemaining
  });

  if (result.ok) {
    redirect(buildDuoPath("/app/dupla", { estado: status }));
  }

  redirect(
    buildDuoPath("/parear", {
      estado: status,
      modo: "entrar",
      restantes: result.attemptsRemaining
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

function parseOptionalNumber(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}
