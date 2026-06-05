import Image from "next/image";

import { MatchScoreBlock } from "../../../components/match-score-block";
import { LibraryStatusControls } from "./library-status-controls";
import type { LibraryGameDetailView } from "./view-models";

export function LibraryQueueCard({
  action,
  enhancedAction,
  game,
  returnTo
}: {
  action: (formData: FormData) => Promise<void>;
  enhancedAction?: (formData: FormData) => Promise<{ ok: boolean; redirectTo?: string }>;
  game: LibraryGameDetailView;
  returnTo: string;
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
          <h3>
            <a className="queue2-focusable" href={`/app/jogo/${game.slug}`}>
              {game.name}
            </a>
          </h3>
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
        <LibraryStatusControls
          action={action}
          catalogGameId={game.catalogGameId}
          currentStatus={game.status}
          enhancedAction={enhancedAction}
          returnTo={returnTo}
        />
      </div>
    </article>
  );
}
