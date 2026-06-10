import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "../../../components/app-shell";
import { getDuoDashboard } from "../../../modules/duo";
import {
  getDuoNotifications,
  NotificationCenter
} from "../../../modules/play";
import { requireVerifiedSession } from "../../../platform/auth/session";

export const metadata: Metadata = {
  description:
    "Hall preparado do QUEUE/2 para a futura estante compartilhada da dupla.",
  title: "Hall"
};

export default async function HallPage() {
  const session = await requireVerifiedSession();
  const [dashboard, notificationsResult] = await Promise.all([
    getDuoDashboard(session.user.id),
    getDuoNotifications({ userId: session.user.id })
  ]);

  if (dashboard.routeState === "pairing" || !dashboard.duo) {
    redirect("/parear");
  }

  if (dashboard.routeState === "naming") {
    redirect("/app/dupla?estado=dupla-formada");
  }

  return (
    <AppShell
      currentPage="hall"
      notificationCenter={
        <NotificationCenter center={notificationsResult.ok ? notificationsResult.center : null} />
      }
    >
      <header className="app-header hall-prepared-header">
        <div>
          <p className="eyebrow">Hall</p>
          <h1 className="page-title">ESTANTE VAZIA</h1>
          <p className="lede">
            POR ENQUANTO, a dupla ainda nao registrou uma zerada confirmada.
          </p>
        </div>
      </header>

      <section className="hall-empty-panel empty-state dry-panel app-section" aria-labelledby="hall-empty-title">
        <div className="section-heading">
          <p className="eyebrow">POR ENQUANTO</p>
          <h2 id="hall-empty-title">ESTANTE VAZIA</h2>
        </div>
        <p>
          Nada para exibir ainda. Continuem escolhendo, jogando e confirmando
          as zeradas da fila compartilhada; a estante entra quando houver
          memoria real para guardar.
        </p>
      </section>
    </AppShell>
  );
}
