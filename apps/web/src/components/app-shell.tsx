import type { ReactNode } from "react";
import { QueueMark, QueueWordmark, RoulettePointer } from "@queue/ui";

type AppShellPage = "dashboard" | "perfil" | "dupla";

const navigation = [
  { href: "/app", label: "Dashboard", page: "dashboard" },
  { href: "/app/dupla", label: "Dupla", page: "dupla" },
  { href: "/app/perfil", label: "Perfil", page: "perfil" }
] as const;

export function AppShell({
  children,
  currentPage
}: {
  children: ReactNode;
  currentPage: AppShellPage;
}) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar queue2-grain" aria-label="Navegacao principal">
        <div>
          <a className="queue2-focusable" href="/app" aria-label="Ir para o dashboard QUEUE dois">
            <QueueWordmark compact />
          </a>
          <nav className="app-nav" aria-label="Paginas autenticadas da Fase 1">
            {navigation.map((item) => (
              <a
                aria-current={currentPage === item.page ? "page" : undefined}
                className="queue2-focusable"
                href={item.href}
                key={item.href}
              >
                <RoulettePointer aria-hidden="true" label="" />
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
        </div>
        <div className="neutral-state">
          <QueueMark size={40} />
          <span>/2: uma fila, dois jogadores, progresso compartilhado.</span>
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
