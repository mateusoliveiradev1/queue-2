import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NotificationCenter } from "../src/modules/play/presentation/notification-center";
import { PushPreferences } from "../src/modules/play/presentation/push-preferences";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Phase 04.5 notification UI", () => {
  it("renders Central da Dupla as operational notifications only", () => {
    render(
      <NotificationCenter
        center={{
          unreadCount: 2,
          items: [
            {
              id: "notification-1",
              duoId: "duo-1",
              recipientUserId: null,
              notificationType: "scheduled-session",
              state: "unread",
              actionRefType: "scheduled_session",
              actionRefId: "scheduled-1",
              title: "Sessao agendada",
              body: "A dupla tem uma sessao futura combinada.",
              createdAt: new Date("2026-06-05T12:00:00.000Z")
            }
          ]
        }}
      />
    );

    expect(screen.getByRole("heading", { name: /central da dupla/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/2 notificacoes nao lidas/i)).toBeInTheDocument();
    expect(screen.getByText(/sessao agendada/i)).toBeInTheDocument();
    expect(screen.queryByText(/chat/i)).not.toBeInTheDocument();
  });

  it("summarizes notifications outside the sidebar list", () => {
    render(
      <NotificationCenter
        center={{
          unreadCount: 7,
          items: Array.from({ length: 5 }, (_, index) => ({
            id: `notification-${index}`,
            duoId: "duo-1",
            recipientUserId: null,
            notificationType: "session-confirmation",
            state: "unread",
            actionRefType: "play_session",
            actionRefId: `session-${index}`,
            title: "Confirmar sessao ao vivo",
            body: "A sessao encerrada so vira progresso depois da confirmacao dos dois.",
            createdAt: new Date("2026-06-05T12:00:00.000Z")
          }))
        }}
      />
    );

    expect(screen.getAllByText(/confirmar sessao ao vivo/i)).toHaveLength(5);
    expect(screen.getByText("+2 pendencias fora do resumo")).toBeInTheDocument();
  });

  it("does not request browser push permission on initial render", () => {
    const requestPermission = vi.fn();
    vi.stubGlobal("Notification", { requestPermission });

    render(<PushPreferences />);

    expect(requestPermission).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /ativar push de sessoes/i })).toBeInTheDocument();
  });
});
