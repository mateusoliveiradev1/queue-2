import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { QueueMark, QueueWordmark, RoulettePointer } from "@queue/ui";

import { CopyPairingCode } from "../../../components/copy-pairing-code";
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
import { requireVerifiedSession } from "../../../platform/auth/session";
import { recordSecurityAuditEvent } from "../../../platform/security/audit";

export const metadata: Metadata = {
  title: "Parear - QUEUE/2"
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
          <QueueWordmark variant="stacked" />
          <div>
            <p className="eyebrow">/2 e regra de produto</p>
            <h1 className="page-title" id="pair-title">
              Parear a dupla
            </h1>
            <p className="lede">
              Crie um convite ou entre com codigo. Quando os dois chegam, a fila
              deixa de ser minha e vira nossa.
            </p>
          </div>
          <div className="neutral-state">
            <RoulettePointer aria-hidden="true" label="" tone="accent" />
            <span>A dupla fica fixa nesta fase: exatamente dois jogadores.</span>
          </div>
        </div>

        <section className="auth-panel" aria-label="Pareamento por codigo">
          <QueueMark size={52} />
          <StatusToast message={statusMessage} state={getSearchParam(params?.estado)} />
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
          Compartilhe este codigo com a outra pessoa. O convite vale por 24 horas e
          pode ser revogado antes do uso.
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
          <button className="queue2-button" data-tone="quiet" type="submit">
            Revogar convite
          </button>
        </form>
        <div className="neutral-state">
          <RoulettePointer aria-hidden="true" label="" />
          <span>A fila virou nossa quando o segundo jogador entrar.</span>
        </div>
      </div>
    );
  }

  return (
    <form action={createPairingCodeAction} className="form-stack">
      <p className="support-copy">
        Crie um codigo de seis caracteres para convidar a outra pessoa da dupla.
      </p>
      <TimezoneInput defaultValue={timezone} detectOnMount />
      <p className="support-copy">
        Confirme o timezone detectado. Resets e sessoes futuras usam esse fuso.
      </p>
      <button className="queue2-button" data-tone="primary" type="submit">
        Criar codigo da dupla
      </button>
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
      <button className="queue2-button" data-tone="primary" type="submit">
        Entrar com codigo
      </button>
      <p className="support-copy">
        Inserir um codigo ativo forma a dupla imediatamente.
      </p>
    </form>
  );
}

async function createPairingCodeAction(formData: FormData) {
  "use server";

  const session = await requireVerifiedSession();
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

  const session = await requireVerifiedSession();
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

  const session = await requireVerifiedSession();
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
