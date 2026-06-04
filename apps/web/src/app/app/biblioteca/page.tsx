import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { AppShell } from "../../../components/app-shell";
import { MatchScoreBlock } from "../../../components/match-score-block";
import { StatusToast } from "../../../components/status-toast";
import { getDuoDashboard } from "../../../modules/duo";
import {
  getLibraryOverview,
  isPhase2LibraryStatus,
  LibraryStatusControls,
  PlatformPicker,
  toLibraryOverviewView,
  type LibraryGameDetailView,
  type Phase2LibraryStatus,
  type PlatformKey
} from "../../../modules/library";
import { requireVerifiedSession } from "../../../platform/auth/session";
import {
  moveLibraryGameAction,
  updateMemberPlatformsAction
} from "../phase-2-actions";
import {
  getPhase2StatusMessage,
  getSearchParam
} from "../phase-2-status";

export const metadata: Metadata = {
  description:
    "Biblioteca compartilhada do QUEUE/2 para organizar Wishlist, Jogando e Pausado da dupla.",
  title: "Biblioteca da dupla"
};

type LibraryPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const statusSections: Array<{
  status: Phase2LibraryStatus;
  title: string;
  empty: string;
}> = [
  {
    status: "wishlist",
    title: "Wishlist",
    empty: "A Wishlist ainda esta vazia. Puxem o primeiro jogo pelo Catalogo."
  },
  {
    status: "jogando",
    title: "Jogando",
    empty: "Nenhum jogo em Jogando. A fila segura no maximo tres ativos por vez."
  },
  {
    status: "pausado",
    title: "Pausado",
    empty: "Nada pausado. Quando a dupla quiser respirar, o jogo aparece aqui."
  }
];

export default async function LibraryPage({ searchParams }: LibraryPageProps = {}) {
  const session = await requireVerifiedSession();
  const [dashboard, libraryResult, params] = await Promise.all([
    getDuoDashboard(session.user.id),
    getLibraryOverview(session.user.id),
    searchParams
  ]);

  if (dashboard.routeState === "pairing") {
    redirect("/parear");
  }

  if (dashboard.routeState === "naming") {
    redirect("/app/dupla?estado=dupla-formada");
  }

  if (!libraryResult.ok) {
    redirect("/parear");
  }

  const activeFilter = parseLibraryFilter(getSearchParam(params?.status));
  const state = getSearchParam(params?.estado);
  const statusMessage = getPhase2StatusMessage(state);
  const overview = libraryResult.overview;
  const view = toLibraryOverviewView(overview);
  const selectedPlatforms =
    overview.memberPlatforms.find((member) => member.userId === session.user.id)?.platforms ?? [];
  const sections =
    activeFilter === "todas"
      ? statusSections
      : statusSections.filter((section) => section.status === activeFilter);
  const returnTo = buildLibraryPath(activeFilter);

  return (
    <AppShell currentPage="biblioteca">
      <header className="app-header">
        <div>
          <p className="eyebrow">Biblioteca da dupla</p>
          <h1 className="page-title">A fila compartilhada</h1>
          <p className="lede">
            Wishlist, Jogando e Pausado ja movem os dois. Zerado e Dropado ficam
            bloqueados ate a dupla confirmar conclusao ou abandono em conjunto.
          </p>
        </div>
        <a className="queue2-button" data-tone="quiet" href="/app/catalogo">
          Buscar jogos
        </a>
      </header>

      {statusMessage ? (
        <>
          <StatusToast message={statusMessage} state={state} />
          <p className="status-banner" role="status">
            {statusMessage}
          </p>
        </>
      ) : null}

      <section className="surface-band app-section" aria-labelledby="platforms-title">
        <div className="section-heading">
          <h2 className="eyebrow" id="platforms-title">
            Plataformas da dupla
          </h2>
          <p className="support-copy">
            Cada pessoa registra as proprias plataformas. A intersecao guia a
            compatibilidade sem virar competicao individual.
          </p>
        </div>
        <div className="library-overview-grid">
          <PlatformPicker
            action={updateMemberPlatformsAction}
            returnTo={returnTo}
            selected={selectedPlatforms as PlatformKey[]}
          />
          <div className="common-platforms">
            <span className="eyebrow">Em comum</span>
            <strong>
              {view.commonPlatformLabels.length
                ? view.commonPlatformLabels.join(", ")
                : "Nenhuma plataforma em comum ainda"}
            </strong>
            <p className="support-copy">
              Jogos sem plataforma comum podem ficar na Wishlist, mas nao viram
              recomendacao forte.
            </p>
          </div>
        </div>
      </section>

      <section className="surface-band app-section" aria-labelledby="library-filter-title">
        <div className="section-heading">
          <h2 className="eyebrow" id="library-filter-title">
            Estados da fila
          </h2>
          <p className="support-copy">
            Use os filtros para focar uma etapa ou veja a biblioteca inteira.
          </p>
        </div>
        <nav className="library-tabs" aria-label="Filtrar biblioteca por status">
          <a aria-current={activeFilter === "todas" ? "page" : undefined} href="/app/biblioteca">
            Todas
          </a>
          {statusSections.map((section) => (
            <a
              aria-current={activeFilter === section.status ? "page" : undefined}
              href={buildLibraryPath(section.status)}
              key={section.status}
            >
              {section.title}
              <span>{view.counts[section.status]}</span>
            </a>
          ))}
        </nav>
      </section>

      <div className="library-board">
        {sections.map((section) => (
          <section
            aria-labelledby={`library-${section.status}`}
            className="surface-band app-section"
            key={section.status}
          >
            <div className="section-heading">
              <h2 className="eyebrow" id={`library-${section.status}`}>
                {section.title}
              </h2>
              <p className="support-copy">{view.counts[section.status]} jogos neste estado.</p>
            </div>
            {view.groups[section.status].length > 0 ? (
              <div className="library-list">
                {view.groups[section.status].map((game) => (
                  <LibraryGameCard
                    game={game}
                    key={game.id}
                    returnTo={returnTo}
                    status={section.status}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>{section.empty}</strong>
              </div>
            )}
          </section>
        ))}
      </div>

      <section className="surface-band app-section" aria-labelledby="locked-statuses">
        <div className="section-heading">
          <h2 className="eyebrow" id="locked-statuses">
            Estados futuros
          </h2>
          <p className="support-copy">
            Estes estados ja aparecem no contrato da fila, mas so liberam com
            confirmacao dos dois.
          </p>
        </div>
        <div className="locked-status-grid">
          {view.lockedStatuses.map((item) => (
            <div aria-disabled="true" className="locked-step" key={item.status}>
              <strong>{item.status}</strong>
              <span className="muted">{item.label}</span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function LibraryGameCard({
  game,
  returnTo,
  status
}: {
  game: LibraryGameDetailView;
  returnTo: string;
  status: Phase2LibraryStatus;
}) {
  return (
    <article className="library-game">
      <a className="library-cover queue2-focusable" href={`/app/jogo/${game.slug}`}>
        {game.coverUrl ? (
          <Image
            alt={`Capa de ${game.name}`}
            height={320}
            sizes="96px"
            src={game.coverUrl}
            width={240}
          />
        ) : (
          <span aria-hidden="true">/2</span>
        )}
      </a>
      <div className="library-game-body">
        <div>
          <p className="eyebrow">{game.status}</p>
          <h3>{game.name}</h3>
          <p className="support-copy">
            {game.commonPlatformLabels.length
              ? `Em comum: ${game.commonPlatformLabels.join(", ")}`
              : "Sem plataforma comum registrada para este jogo."}
          </p>
        </div>
        <MatchScoreBlock
          factors={game.match.factors}
          label={game.match.label}
          recommended={game.match.recommendedForMainFlow}
        />
        <div className="form-actions">
          <a className="queue2-button" data-tone="quiet" href={`/app/jogo/${game.slug}`}>
            Abrir detalhe
          </a>
          <LibraryStatusControls
            action={moveLibraryGameAction}
            catalogGameId={game.catalogGameId}
            currentStatus={status}
            returnTo={returnTo}
          />
        </div>
      </div>
    </article>
  );
}

function buildLibraryPath(filter: Phase2LibraryStatus | "todas"): string {
  if (filter === "todas") {
    return "/app/biblioteca";
  }

  const params = new URLSearchParams({ status: filter });
  return `/app/biblioteca?${params.toString()}`;
}

function parseLibraryFilter(value: string | null): Phase2LibraryStatus | "todas" {
  return value && isPhase2LibraryStatus(value) ? value : "todas";
}
