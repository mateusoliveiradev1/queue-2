import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "../../../components/app-shell";
import { getDuoDashboard } from "../../../modules/duo";
import {
  ChallengeBoard,
  getChallenges,
  StreakPanel,
  toChallengeRouteView
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
  buildChallengePath,
  parseChallengeRouteParams
} from "./challenge-route-params";

export const metadata: Metadata = {
  description:
    "Desafios semanais, mensais e sazonais do QUEUE/2 com streak coletivo e Streak Freeze da dupla.",
  title: "Desafios da dupla"
};

type ChallengesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const challengesTimingContext = { route: "app.desafios" } as const;

export default async function ChallengesPage({
  searchParams
}: ChallengesPageProps = {}) {
  return withServerTiming(challengesTimingContext, () =>
    renderChallengesPage({ searchParams })
  );
}

async function renderChallengesPage({
  searchParams
}: ChallengesPageProps = {}) {
  const session = await measureStage("auth", challengesTimingContext, () =>
    requireVerifiedSession()
  );
  const [dashboard, notificationsResult, params] = await measureStage(
    "database",
    challengesTimingContext,
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

  const routeParams = parseChallengeRouteParams(params);

  if (routeParams.invalidPeriod) {
    redirect("/app/desafios");
  }

  const challengeRecord = await measureStage("database", challengesTimingContext, () =>
    getChallenges({
      userId: session.user.id
    })
  );

  if (!challengeRecord) {
    redirect("/parear");
  }

  const view = toChallengeRouteView(
    challengeRecord,
    (period) => buildChallengePath(routeParams, { period }),
    routeParams.period
  );

  return measureStage("render", challengesTimingContext, async () => (
    <AppShell
      currentPage="desafios"
      notificationCenter={
        <NotificationCenter center={notificationsResult.ok ? notificationsResult.center : null} />
      }
    >
      <header className="app-header challenges-header">
        <div>
          <p className="eyebrow">Desafios</p>
          <h1 className="page-title" id="challenges-route-title">
            Desafios da dupla
          </h1>
          <p className="lede">
            Convites semanais, mensais e sazonais para a fila continuar viva
            com progresso confirmado no servidor.
          </p>
        </div>
        <div className="achievements-header-actions">
          <a className="queue2-button" data-tone="quiet" href="/app">
            Voltar para a fila
          </a>
          <a className="queue2-button" data-tone="quiet" href="/app/conquistas">
            Ver conquistas
          </a>
        </div>
      </header>

      <section className="challenges-route" aria-labelledby="challenges-route-title">
        <StreakPanel streak={view.streak} />
        <ChallengeBoard view={view} />
      </section>
    </AppShell>
  ));
}
