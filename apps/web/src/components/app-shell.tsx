import type { ReactNode } from "react";
import { QueueMark, QueueWordmark } from "@queue/ui";

import { logoutCurrentSessionAction } from "../platform/auth/session";

type AppShellPage =
  | "dashboard"
  | "catalogo"
  | "descobrir"
  | "biblioteca"
  | "roleta"
  | "conquistas"
  | "desafios"
  | "hall"
  | "perfil"
  | "dupla";

const primaryNavigation = [
  { href: "/app", label: "Home", page: "dashboard" },
  { href: "/app/biblioteca", label: "Biblioteca", page: "biblioteca" },
  { href: "/app/descobrir", label: "Descobrir", page: "descobrir" },
  { href: "/app/roleta", label: "Roleta", page: "roleta" },
  { href: "/app/desafios", label: "Desafios", page: "desafios" },
  { href: "/app/hall", label: "Hall", page: "hall" },
  { href: "/app/dupla", label: "Dupla", page: "dupla" }
] as const;

const contextualNavigation = [
  { href: "/app/catalogo", label: "Catalogo", page: "catalogo" },
  { href: "/app/conquistas", label: "Conquistas", page: "conquistas" }
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
    <div className="app-shell queue2-shell">
      <header className="app-topbar queue2-grain">
        <div className="app-topbar-inner">
          <a className="app-shell-brand queue2-focusable" href="/app" aria-label="Ir para a home QUEUE dois">
            <QueueWordmark compact />
          </a>
          <nav className="app-route-rail" aria-label="Navegacao principal da area autenticada QUEUE dois">
            {primaryNavigation.map((item) => (
              <AppNavLink
                href={item.href}
                isActive={currentPage === item.page}
                key={item.href}
                label={item.label}
              />
            ))}
          </nav>
          <div className="app-shell-actions" aria-label="Acoes da conta">
            {notificationCenter ? (
              <div className="app-notification-slot">{notificationCenter}</div>
            ) : null}
            <nav className="app-context-links" aria-label="Acessos contextuais">
              {contextualNavigation.map((item) => (
                <a
                  aria-current={currentPage === item.page ? "page" : undefined}
                  className="queue2-focusable"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <a
              aria-current={currentPage === "perfil" ? "page" : undefined}
              className="app-profile-link queue2-focusable"
              href="/app/perfil"
            >
              <QueueMark aria-hidden="true" label="" size={28} />
              <span>Perfil</span>
            </a>
            <form action={logoutCurrentSessionAction}>
              <button className="app-logout-button queue2-focusable" type="submit">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}

function AppNavLink({
  href,
  isActive,
  label
}: {
  href: string;
  isActive: boolean;
  label: string;
}) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      className="app-route-link queue2-focusable"
      data-active={isActive ? "true" : "false"}
      href={href}
    >
      <span className="app-route-link__slash" aria-hidden="true">
        /
      </span>
      <span>{label}</span>
    </a>
  );
}
