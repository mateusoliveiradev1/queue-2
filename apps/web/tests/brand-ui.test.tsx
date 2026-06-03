import { cleanup, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueueToaster } from "@queue/ui";

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

const libraryModuleMock = vi.hoisted(() => ({
  getLibraryOverview: vi.fn()
}));

vi.mock("../src/platform/auth/session", () => ({
  getVerifiedProfileAuthContext: vi.fn(async () => authSessionMock),
  hashSessionToken: vi.fn((token: string | undefined) => (token ? `hashed-${token}` : "")),
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

vi.mock("../src/modules/library", async () => {
  const viewModels = await vi.importActual<
    typeof import("../src/modules/library/presentation/view-models")
  >("../src/modules/library/presentation/view-models");

  return {
    ...viewModels,
    getLibraryOverview: libraryModuleMock.getLibraryOverview
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
import HomePage from "../src/app/page";
import Loading from "../src/app/loading";
import { StatusToast } from "../src/components/status-toast";

const iconSource = readFileSync("src/app/icon.svg", "utf8");

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  duoModuleMock.getDuoDashboard.mockResolvedValue(duoModuleMock.noDuo);
  libraryModuleMock.getLibraryOverview.mockResolvedValue({
    ok: true,
    overview: {
      memberPlatforms: [
        { userId: "user-1", platforms: [] },
        { userId: "user-2", platforms: [] }
      ],
      commonPlatforms: [],
      groups: {
        wishlist: [],
        jogando: [],
        pausado: []
      },
      lockedStatuses: ["zerado", "dropado"]
    }
  });
});

describe("public QUEUE/2 route surfaces", () => {
  it("renders the interim home with brand, product promise and entry actions", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: /queue\s*\/2/i })).toBeInTheDocument();
    expect(screen.getByText(/nenhum jogo entra sozinho/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^entrar$/i })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /criar conta/i })).toHaveAttribute("href", "/cadastro");
    expect(screen.getByRole("link", { name: /parear agora/i })).toHaveAttribute("href", "/parear");
    expect(screen.getByText(/sem terceiro lugar/i)).toBeInTheDocument();
  });

  it("renders login with accessible email and password fields", async () => {
    render(await LoginPage());

    expect(screen.getByRole("heading", { name: /voltar para a fila/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
  });

  it("lets the public brand mark navigate back to the interim home", async () => {
    render(await LoginPage());

    const homeLinks = screen.getAllByRole("link", { name: /ir para a home queue dois/i });

    expect(homeLinks.length).toBeGreaterThanOrEqual(2);
    for (const link of homeLinks) {
      expect(link).toHaveAttribute("href", "/");
    }
  });

  it("renders signup with progressive password checklist hooks", async () => {
    render(await SignupPage());

    expect(screen.getByLabelText(/nome de exibicao/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar senha/i)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: /checklist da senha/i })).toBeInTheDocument();
    expect(screen.getByText(/pelo menos 8 caracteres/i)).toBeInTheDocument();
    expect(screen.getByText(/senhas precisam conferir/i)).toBeInTheDocument();
  });

  it("renders the /2 route loader and favicon placeholder", () => {
    render(<Loading />);

    expect(screen.getByRole("status", { name: /carregando a fila/i })).toBeInTheDocument();
    expect(iconSource).toContain("<svg");
    expect(iconSource).toContain("#c9f72b");
  });

  it("renders a restrained special toast for pairing success", async () => {
    render(
      <>
        <QueueToaster />
        <StatusToast
          message="A fila agora e nossa."
          state="dupla-formada"
          variant="special"
        />
      </>
    );

    expect(await screen.findByText(/a fila agora e nossa/i)).toBeInTheDocument();
    expect(screen.getByText(/dupla formada/i)).toBeInTheDocument();
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
    expect(screen.getByText(/sem expor quais contas/i)).toBeInTheDocument();
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
  it("renders the Phase 2 dashboard with catalog and library entry points", async () => {
    duoModuleMock.getDuoDashboard.mockResolvedValueOnce(duoModuleMock.ready);
    render(await DashboardPage());
    const navigation = within(
      screen.getByRole("navigation", { name: /area autenticada queue dois/i })
    );

    expect(screen.getByRole("heading", { name: /a fila ja pode crescer/i })).toBeInTheDocument();
    expect(navigation.getByRole("link", { name: /catalogo/i })).toHaveAttribute("href", "/app/catalogo");
    expect(navigation.getByRole("link", { name: /biblioteca/i })).toHaveAttribute("href", "/app/biblioteca");
    expect(screen.getByText("descobrir")).toBeInTheDocument();
    expect(screen.getByText("decidir")).toBeInTheDocument();
    expect(screen.getByText("zerar")).toBeInTheDocument();
    expect(screen.getByText(/nada inventado/i)).toBeInTheDocument();
  });

  it("renders profile display name, active sessions and logout sections", async () => {
    duoModuleMock.getDuoDashboard.mockResolvedValueOnce(duoModuleMock.ready);
    const { container } = render(await ProfilePage());

    expect(screen.getAllByText(/nome visivel|nome de exibicao/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /acessos ativos/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /encerrar sessao/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^sair$/i })).toBeInTheDocument();
    expectEveryVisibleFormControlHasName(container);
  });

  it("renders duo identity, members, paired date, timezone and preferences", async () => {
    duoModuleMock.getDuoDashboard.mockResolvedValueOnce(duoModuleMock.ready);
    const { container } = render(await DuoPage());

    expect(screen.getAllByText(/nome da dupla/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /membros fixos/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /desde quando/i })).toBeInTheDocument();
    expect(screen.getAllByText(/fuso da dupla/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /preferencias da dupla/i })).toBeInTheDocument();
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
