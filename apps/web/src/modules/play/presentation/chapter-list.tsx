import type { GamePlayDetailRecord } from "../application/ports";

type PlayJourneyAction = (formData: FormData) => void | Promise<void>;

export function ChapterList({
  catalogGameId,
  createAction,
  gameSlug,
  playDetail,
  toggleAction
}: {
  catalogGameId: string;
  createAction: PlayJourneyAction;
  gameSlug: string;
  playDetail: GamePlayDetailRecord | null;
  toggleAction: PlayJourneyAction;
}) {
  const chapters = playDetail?.chapters ?? [];

  return (
    <section className="surface-band app-section play-panel" aria-labelledby="chapters-title">
      <div className="section-heading">
        <h2 className="eyebrow" id="chapters-title">
          Capitulos
        </h2>
        <p className="support-copy">
          Capitulo completo rende 25 XP uma vez. Reabrir e concluir de novo nao farma premio.
        </p>
      </div>
      <form action={createAction} className="chapter-create-form">
        <input name="catalogGameId" type="hidden" value={catalogGameId} />
        <input name="gameSlug" type="hidden" value={gameSlug} />
        <label>
          <span>Novo capitulo</span>
          <input maxLength={120} name="title" placeholder="Ex.: Ato 1 completo" />
        </label>
        <button className="queue2-button" data-tone="primary" type="submit">
          Criar capitulo
        </button>
      </form>
      {chapters.length ? (
        <ol className="chapter-list">
          {chapters.map((chapter) => (
            <li className="chapter-row" key={chapter.id}>
              <div>
                <strong>{chapter.title}</strong>
                <span className="muted">
                  {chapter.completedAt ? "Concluido pela dupla" : "Aberto"}
                </span>
              </div>
              <form action={toggleAction}>
                <input name="chapterId" type="hidden" value={chapter.id} />
                <input
                  name="completed"
                  type="hidden"
                  value={chapter.completedAt ? "false" : "true"}
                />
                <input name="gameSlug" type="hidden" value={gameSlug} />
                <button className="queue2-button" data-tone="quiet" type="submit">
                  {chapter.completedAt ? "Reabrir" : "Concluir"}
                </button>
              </form>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-state">Nenhum capitulo manual registrado.</p>
      )}
    </section>
  );
}
