import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authSessionMock = vi.hoisted(() => {
  const currentSession = {
    session: {
      id: "session-current",
      token: "session-token-current",
      userId: "user-1",
      createdAt: new Date("2026-06-03T09:00:00.000Z"),
      updatedAt: new Date("2026-06-03T10:00:00.000Z"),
      expiresAt: new Date("2026-06-17T09:00:00.000Z")
    },
    user: {
      id: "user-1",
      email: "jogador@example.com",
      emailVerified: true,
      name: "Jogador da fila",
      image: null,
      createdAt: new Date("2026-06-03T09:00:00.000Z"),
      updatedAt: new Date("2026-06-03T09:00:00.000Z")
    }
  };

  return {
    currentSession,
    activeSessions: [
      currentSession.session,
      {
        id: "session-secondary",
        token: "session-token-secondary",
        userId: "user-1",
        createdAt: new Date("2026-06-02T09:00:00.000Z"),
        updatedAt: new Date("2026-06-03T09:30:00.000Z"),
        expiresAt: new Date("2026-06-16T09:00:00.000Z")
      }
    ]
  };
});

const duoModuleMock = vi.hoisted(() => {
  const memberOne = {
    userId: "user-1",
    displayName: "Jogador da fila",
    memberSlot: 1 as const,
    joinedAt: new Date("2026-06-03T09:00:00.000Z")
  };
  const memberTwo = {
    userId: "user-2",
    displayName: "Parceiro da fila",
    memberSlot: 2 as const,
    joinedAt: new Date("2026-06-03T10:00:00.000Z")
  };
  const duo = {
    id: "duo-1",
    name: "Dupla do sofa",
    pairedAt: new Date("2026-06-03T10:00:00.000Z"),
    timezone: "America/Sao_Paulo",
    notificationsEnabled: true,
    audioEnabled: true,
    members: [memberOne, memberTwo]
  };

  return {
    noDuo: {
      routeState: "pairing" as const,
      profileDisplayName: "Jogador da fila",
      duo: null,
      activePairingCode: null
    },
    awaiting: {
      routeState: "pairing" as const,
      profileDisplayName: "Jogador da fila",
      duo: {
        ...duo,
        name: null,
        pairedAt: null,
        members: [memberOne]
      },
      activePairingCode: {
        id: "code-1",
        duoId: "duo-1",
        code: "Q2K7M9",
        expiresAt: new Date("2026-06-04T10:00:00.000Z"),
        revokedAt: null,
        claimedAt: null
      }
    },
    ready: {
      routeState: "ready" as const,
      profileDisplayName: "Jogador da fila",
      duo,
      activePairingCode: null
    },
    getDuoDashboard: vi.fn()
  };
});

vi.mock("../src/platform/auth/session", () => ({
  getVerifiedProfileAuthContext: vi.fn(async () => authSessionMock),
  logoutCurrentSessionAction: vi.fn(async () => undefined),
  requireVerifiedSession: vi.fn(async () => authSessionMock.currentSession),
  revokeSessionAction: vi.fn(async () => undefined)
}));

vi.mock("../src/modules/duo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/modules/duo")>();

  return {
    ...actual,
    createPairingCode: vi.fn(async () => ({
      ok: true,
      state: "code-created",
      code: duoModuleMock.awaiting.activePairingCode
    })),
    getDuoDashboard: duoModuleMock.getDuoDashboard,
    joinDuo: vi.fn(async () => ({ ok: true, state: "paired", duoId: "duo-1" })),
    revokePairingCode: vi.fn(async () => ({ ok: true, state: "code-revoked" })),
    updateDuoSettings: vi.fn(async () => ({ ok: true, state: "duo-updated" })),
    updateProfileDisplayName: vi.fn(async () => ({
      ok: true,
      state: "profile-updated"
    }))
  };
});

import SignupPage from "../src/app/(public)/cadastro/page";
import LoginPage from "../src/app/(public)/login/page";
import PairingPage from "../src/app/(public)/parear/page";
import RecoverPasswordPage from "../src/app/(public)/recuperar-senha/page";
import VerifyEmailPage from "../src/app/(public)/verificar-email/page";
import DashboardPage from "../src/app/app/page";
import DuoPage from "../src/app/app/dupla/page";
import ProfilePage from "../src/app/app/perfil/page";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  duoModuleMock.getDuoDashboard.mockResolvedValue(duoModuleMock.noDuo);
});

describe("public QUEUE/2 route surfaces", () => {
  it("renders login with accessible email and password fields", async () => {
    render(await LoginPage());

    expect(screen.getByRole("heading", { name: /entrar na fila da dupla/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
  });

  it("renders signup with progressive password checklist hooks", async () => {
    render(await SignupPage());

    expect(screen.getByLabelText(/nome de exibicao/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: /checklist da senha/i })).toBeInTheDocument();
    expect(screen.getByText(/pelo menos 8 caracteres/i)).toBeInTheDocument();
  });

  it("renders verification actions for resend, correction and logout", async () => {
    render(await VerifyEmailPage());

    expect(screen.getByRole("button", { name: /reenviar email/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/corrigir email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sair desta conta/i })).toBeInTheDocument();
  });

  it("renders password recovery with neutral reset copy", async () => {
    render(await RecoverPasswordPage());

    expect(screen.getByRole("heading", { name: /recuperar senha/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email da conta/i)).toBeInTheDocument();
    expect(screen.getByText(/mensagem e neutra/i)).toBeInTheDocument();
  });

  it("renders pairing create-code mode with copy and validity", async () => {
    duoModuleMock.getDuoDashboard.mockResolvedValueOnce(duoModuleMock.awaiting);
    render(await PairingPage());

    expect(screen.getByRole("tab", { name: /criar dupla/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /entrar com codigo/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/codigo de pareamento q2k7m9/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copiar codigo/i })).toBeInTheDocument();
    expect(screen.getByText(/validade:/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /revogar convite/i })).toBeInTheDocument();
  });
});

describe("authenticated Phase 1 surfaces", () => {
  it("renders the empty dashboard with the exact three-step ritual", async () => {
    duoModuleMock.getDuoDashboard.mockResolvedValueOnce(duoModuleMock.ready);
    render(await DashboardPage());

    expect(screen.getByRole("heading", { name: /a fila ainda esta vazia/i })).toBeInTheDocument();
    expect(screen.getByText("descobrir")).toBeInTheDocument();
    expect(screen.getByText("sortear")).toBeInTheDocument();
    expect(screen.getByText("zerar")).toBeInTheDocument();
    expect(screen.getByText(/sem catalogo falso nesta fase/i)).toBeInTheDocument();
  });

  it("renders profile display name, active sessions and logout sections", async () => {
    duoModuleMock.getDuoDashboard.mockResolvedValueOnce(duoModuleMock.ready);
    const { container } = render(await ProfilePage());

    expect(screen.getAllByText(/nome de exibicao/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /sessoes ativas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /encerrar sessao/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^sair$/i })).toBeInTheDocument();
    expectEveryVisibleFormControlHasName(container);
  });

  it("renders duo identity, members, paired date, timezone and preferences", async () => {
    duoModuleMock.getDuoDashboard.mockResolvedValueOnce(duoModuleMock.ready);
    const { container } = render(await DuoPage());

    expect(screen.getAllByText(/nome da dupla/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /membros/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /data de pareamento/i })).toBeInTheDocument();
    expect(screen.getAllByText(/timezone/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /preferencias compartilhadas/i })).toBeInTheDocument();
    expectEveryVisibleFormControlHasName(container);
  });
});

function expectEveryVisibleFormControlHasName(container: HTMLElement) {
  const controls = Array.from(
    container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      "input:not([type='hidden']), select, textarea"
    )
  );

  for (const control of controls) {
    expect(control).toHaveAccessibleName();
  }
}
