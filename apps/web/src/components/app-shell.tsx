import type { ReactNode } from "react";
import { QueueMark, QueueWordmark, RoulettePointer } from "@queue/ui";

type AppShellPage = "dashboard" | "catalogo" | "biblioteca" | "perfil" | "dupla";

const navigation = [
  { href: "/app", label: "Fila", page: "dashboard" },
  { href: "/app/catalogo", label: "Catalogo", page: "catalogo" },
  { href: "/app/biblioteca", label: "Biblioteca", page: "biblioteca" },
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
          <a className="queue2-focusable" href="/app" aria-label="Ir para a fila QUEUE dois">
            <QueueWordmark compact />
          </a>
          <nav className="app-nav" aria-label="Area autenticada QUEUE dois">
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
          <span>A fila pertence aos dois. Tudo que importa aqui e compartilhado.</span>
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
