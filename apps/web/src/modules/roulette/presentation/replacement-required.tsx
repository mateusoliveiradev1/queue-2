import { ActionFeedbackButton } from "../../../components/action-feedback";

type ReplacementRequiredAction = (formData: FormData) => Promise<void>;

export type ReplacementRequiredGameView = {
  libraryGameId: string;
  name: string;
  roleLabel: string;
};

export function ReplacementRequired({
  games,
  lockAction,
  roundId
}: {
  games: ReplacementRequiredGameView[];
  lockAction?: ReplacementRequiredAction;
  roundId: string;
}) {
  return (
    <section
      aria-labelledby="roulette-replacement-required-title"
      className="roulette-replacement-required"
    >
      <div className="section-heading">
        <p className="eyebrow">Jogando esta cheio</p>
        <h2 id="roulette-replacement-required-title">
          Escolham quem pausa para abrir vaga
        </h2>
        <p className="support-copy">
          Nada muda sozinho. Escolham um Jogando para pausar ou cancelem a trava.
        </p>
      </div>

      {games.length ? (
        <ol className="roulette-replacement-list">
          {games.map((game) => (
            <li className="roulette-replacement-item" key={game.libraryGameId}>
              <div>
                <strong>{game.name}</strong>
                <span>{game.roleLabel}</span>
              </div>
              {lockAction ? (
                <form action={lockAction} className="action-feedback-form">
                  <input name="roundId" type="hidden" value={roundId} />
                  <input
                    name="replacementLibraryGameId"
                    type="hidden"
                    value={game.libraryGameId}
                  />
                  <ActionFeedbackButton
                    aria-label={`Pausar ${game.name} e travar resultado`}
                    labels={{
                      confirmed: "Confirmado",
                      failed: "Tentar de novo",
                      idle: "Pausar e travar",
                      retrying: "Tentando de novo",
                      syncing: "Sincronizando"
                    }}
                    state="idle"
                    tone="primary"
                  />
                </form>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-state">
          Jogando nao carregou agora. Cancelem e tentem novamente.
        </p>
      )}

      <a className="queue2-button" data-tone="quiet" href="/app/roleta">
        Cancelar
      </a>
    </section>
  );
}
