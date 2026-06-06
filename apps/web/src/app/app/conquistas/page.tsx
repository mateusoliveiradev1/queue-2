import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "../../../components/app-shell";
import { getDuoDashboard } from "../../../modules/duo";
import {
  AchievementGrid,
  getAchievements,
  toAchievementRouteView
} from "../../../modules/gamification";
import {
  getDuoNotifications,
  NotificationCenter
} from "../../../modules/play";
import { requireVerifiedSession } from "../../../platform/auth/session";
import {
  measureStage,
  withServerTiming
} from "../../../platform/performance/server-timing";
import {
  buildAchievementPath,
  parseAchievementRouteParams
} from "./achievement-route-params";

export const metadata: Metadata = {
  description:
    "Conquistas compartilhadas do QUEUE/2 com filtros por raridade, grupos de progresso e marcos desbloqueados pela dupla.",
  title: "Conquistas da dupla"
};

type AchievementsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const achievementsTimingContext = { route: "app.conquistas" } as const;

export default async function AchievementsPage({
  searchParams
}: AchievementsPageProps = {}) {
  return withServerTiming(achievementsTimingContext, () =>
    renderAchievementsPage({ searchParams })
  );
}

async function renderAchievementsPage({
  searchParams
}: AchievementsPageProps = {}) {
  const session = await measureStage("auth", achievementsTimingContext, () =>
    requireVerifiedSession()
  );
  const [dashboard, notificationsResult, params] = await measureStage(
    "database",
    achievementsTimingContext,
    () =>
      Promise.all([
        getDuoDashboard(session.user.id),
        getDuoNotifications({ userId: session.user.id }),
        searchParams
      ])
  );

  if (dashboard.routeState === "pairing") {
    redirect("/parear");
  }

  if (dashboard.routeState === "naming") {
    redirect("/app/dupla?estado=dupla-formada");
  }

  const routeParams = parseAchievementRouteParams(params);

  if (routeParams.invalidRarity) {
    redirect("/app/conquistas");
  }

  const achievementRecord = await measureStage("database", achievementsTimingContext, () =>
    getAchievements({
      userId: session.user.id,
      rarity: routeParams.rarity
    })
  );

  if (!achievementRecord) {
    redirect("/parear");
  }

  const view = toAchievementRouteView(achievementRecord, (rarity) =>
    buildAchievementPath(routeParams, { rarity })
  );

  return measureStage("render", achievementsTimingContext, async () => (
    <AppShell
      currentPage="conquistas"
      notificationCenter={
        <NotificationCenter center={notificationsResult.ok ? notificationsResult.center : null} />
      }
    >
      <header className="app-header achievements-header">
        <div>
          <p className="eyebrow">Conquistas</p>
          <h1 className="page-title" id="achievements-route-title">
            Conquistas da dupla
          </h1>
          <p className="lede">
            Marcos visiveis, alguns segredos e raridades que celebram a fila como
            historia compartilhada, sem placar entre jogadores.
          </p>
        </div>
        <div className="achievements-header-actions">
          <a className="queue2-button" data-tone="quiet" href="/app">
            Voltar para a fila
          </a>
        </div>
      </header>

      <AchievementGrid view={view} />
    </AppShell>
  ));
}
