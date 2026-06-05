import type { ReactNode } from "react";
import { QueueMark, QueueWordmark, RoulettePointer } from "@queue/ui";

type AppShellPage =
  | "dashboard"
  | "catalogo"
  | "descobrir"
  | "biblioteca"
  | "perfil"
  | "dupla";

const navigation = [
  { href: "/app", label: "Fila", page: "dashboard" },
  { href: "/app/catalogo", label: "Catalogo", page: "catalogo" },
  { href: "/app/descobrir", label: "Descobrir", page: "descobrir" },
  { href: "/app/biblioteca", label: "Biblioteca", page: "biblioteca" },
  { href: "/app/dupla", label: "Dupla", page: "dupla" },
  { href: "/app/perfil", label: "Perfil", page: "perfil" }
] as const;

export function AppShell({
  children,
  currentPage,
  notificationCenter
}: {
  children: ReactNode;
  currentPage: AppShellPage;
  notificationCenter?: ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar queue2-grain" aria-label="Navegacao principal">
        <div>
          <a className="queue2-focusable" href="/app" aria-label="Ir para a fila QUEUE dois">
            <QueueWordmark compact />
          </a>
          <nav className="app-nav" aria-label="Area autenticada QUEUE dois">
            {navigation.map((item) => {
              const isActive = currentPage === item.page;

              return (
                <a
                  aria-current={isActive ? "page" : undefined}
                  className="queue2-focusable"
                  data-active={isActive ? "true" : "false"}
                  href={item.href}
                  key={item.href}
                >
                  {isActive ? (
                    <RoulettePointer
                      aria-hidden="true"
                      className="app-nav-pointer"
                      label=""
                    />
                  ) : (
                    <span className="app-nav-spacer" aria-hidden="true" />
                  )}
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>
        </div>
        {notificationCenter}
        <div className="neutral-state">
          <QueueMark size={40} />
          <span>A fila pertence aos dois. Tudo que importa aqui e compartilhado.</span>
        </div>
      </aside>
      <main className="app-main">{children}</main>
      <nav className="app-bottom-nav" aria-label="Navegacao principal mobile">
        {navigation.map((item) => {
          const isActive = currentPage === item.page;

          return (
            <a
              aria-current={isActive ? "page" : undefined}
              className="queue2-focusable"
              data-active={isActive ? "true" : "false"}
              href={item.href}
              key={item.href}
            >
              {isActive ? (
                <RoulettePointer
                  aria-hidden="true"
                  className="app-bottom-nav-pointer"
                  label=""
                />
              ) : (
                <span className="app-bottom-nav-dot" aria-hidden="true" />
              )}
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
