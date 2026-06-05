type PlayTimelineAction = (formData: FormData) => void | Promise<void>;

export type MomentoSessionOption = {
  id: string;
  label: string;
};

export function MomentoForm({
  action,
  catalogGameId,
  gameSlug,
  sessionOptions = []
}: {
  action: PlayTimelineAction;
  catalogGameId: string;
  gameSlug: string;
  sessionOptions?: MomentoSessionOption[];
}) {
  return (
    <form action={action} className="momento-form">
      <input name="catalogGameId" type="hidden" value={catalogGameId} />
      <input name="gameSlug" type="hidden" value={gameSlug} />
      <label>
        <span>Novo Momento</span>
        <textarea
          maxLength={2000}
          name="body"
          placeholder="Uma nota curta sobre a sessao, descoberta ou combinacao da dupla"
          rows={3}
        />
      </label>
      {sessionOptions.length ? (
        <label>
          <span>Associar a sessao</span>
          <select name="sessionId">
            <option value="">Sem sessao especifica</option>
            {sessionOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="checkbox-row">
        <input name="isSpoiler" type="checkbox" value="true" />
        <span>Marcar como spoiler</span>
      </label>
      <button className="queue2-button" data-tone="primary" type="submit">
        Adicionar Momento
      </button>
    </form>
  );
}
