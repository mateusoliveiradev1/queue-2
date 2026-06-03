import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

vi.mock("../src/platform/auth/session", () => ({
  getVerifiedProfileAuthContext: vi.fn(async () => authSessionMock),
  logoutCurrentSessionAction: vi.fn(async () => undefined),
  requireVerifiedSession: vi.fn(async () => authSessionMock.currentSession),
  revokeSessionAction: vi.fn(async () => undefined)
}));

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

  it("renders pairing create-code mode with copy, validity and neutral errors", () => {
    render(createElement(PairingPage));

    expect(screen.getByRole("button", { name: /criar dupla/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /entrar com codigo/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/codigo de pareamento q2k7m9/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copiar codigo/i })).toBeInTheDocument();
    expect(screen.getByText(/validade: ate amanha/i)).toBeInTheDocument();
    expect(screen.getByText(/codigo invalido/i)).toBeInTheDocument();
    expect(screen.getByText(/codigo nao ativo/i)).toBeInTheDocument();
    expect(screen.getByText(/muitas tentativas/i)).toBeInTheDocument();
  });
});

describe("authenticated Phase 1 surfaces", () => {
  it("renders the empty dashboard with the exact three-step ritual", async () => {
    render(await DashboardPage());

    expect(screen.getByRole("heading", { name: /fila ainda vazia/i })).toBeInTheDocument();
    expect(screen.getByText("descobrir")).toBeInTheDocument();
    expect(screen.getByText("sortear")).toBeInTheDocument();
    expect(screen.getByText("zerar")).toBeInTheDocument();
    expect(screen.getByText(/sem catalogo falso nesta fase/i)).toBeInTheDocument();
  });

  it("renders profile display name, active sessions and logout sections", async () => {
    const { container } = render(await ProfilePage());

    expect(screen.getAllByText(/nome de exibicao/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /sessoes ativas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /revogar/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^sair$/i })).toBeInTheDocument();
    expectEveryVisibleFormControlHasName(container);
  });

  it("renders duo identity, members, paired date, timezone and preferences", async () => {
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
