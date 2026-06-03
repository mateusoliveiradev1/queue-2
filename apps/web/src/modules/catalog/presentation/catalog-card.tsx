import Image from "next/image";

import type { CatalogGameCardView } from "./view-models";
import { SourceMetadata } from "./source-metadata";
import { MatchScoreBlock } from "../../../components/match-score-block";

export function CatalogCard({
  addAction,
  game,
  priority = false,
  returnTo
}: {
  addAction: (formData: FormData) => Promise<void>;
  game: CatalogGameCardView;
  priority?: boolean;
  returnTo?: string;
}) {
  const factors = [
    game.mainFlow.label,
    game.timeEstimateLabel,
    game.availabilityLabel
  ];

  return (
    <article className={priority ? "catalog-card catalog-card-featured" : "catalog-card"}>
      <a className="catalog-cover queue2-focusable" href={`/app/jogo/${game.slug}`}>
        {game.coverUrl ? (
          <Image
            alt={`Capa de ${game.name}`}
            height={640}
            sizes={priority ? "(max-width: 820px) 100vw, 32vw" : "(max-width: 820px) 100vw, 22vw"}
            src={game.coverUrl}
            width={480}
          />
        ) : (
          <span aria-hidden="true">/2</span>
        )}
      </a>
      <div className="catalog-card-body">
        <div>
          <p className="eyebrow">{priority ? "Sugestao da fila" : "Catalogo"}</p>
          <h2>{game.name}</h2>
          <p className="support-copy">{game.genreLabels.slice(0, 3).join(" / ") || "Generos em sincronizacao"}</p>
        </div>
        <div className="tag-row" aria-label="Plataformas">
          {game.platformLabels.slice(0, 4).map((platform) => (
            <span key={platform}>{platform}</span>
          ))}
        </div>
        <MatchScoreBlock
          factors={factors}
          label={game.mainFlow.eligible ? "Boa base" : "Fora do fluxo"}
          recommended={game.mainFlow.eligible}
        />
        <SourceMetadata source={game.sourceMeta} />
        <div className="form-actions">
          <a className="queue2-button" data-tone="quiet" href={`/app/jogo/${game.slug}`}>
            Abrir detalhe
          </a>
          <form action={addAction}>
            <input name="catalogGameId" type="hidden" value={game.id} />
            {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
            <button className="queue2-button" data-tone="primary" type="submit">
              Adicionar a Wishlist
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}
