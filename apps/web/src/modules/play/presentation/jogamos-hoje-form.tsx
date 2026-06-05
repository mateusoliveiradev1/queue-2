type PlayJourneyAction = (formData: FormData) => void | Promise<void>;

const durationPresets = [
  { label: "30 min", value: 30 },
  { label: "1h", value: 60 },
  { label: "2h", value: 120 }
] as const;

export function JogamosHojeForm({
  action,
  catalogGameId,
  gameSlug
}: {
  action: PlayJourneyAction;
  catalogGameId: string;
  gameSlug: string;
}) {
  return (
    <section className="surface-band app-section play-panel" aria-labelledby="jogamos-hoje-title">
      <div className="section-heading">
        <h2 className="eyebrow" id="jogamos-hoje-title">
          Jogamos Hoje
        </h2>
        <p className="support-copy">
          Registre uma sessao offline em poucos cliques. Ela fica pendente ate o parceiro confirmar.
        </p>
      </div>
      <div className="offline-presets" role="group" aria-label="Duracao da sessao offline">
        {durationPresets.map((preset) => (
          <form action={action} key={preset.value}>
            <input name="catalogGameId" type="hidden" value={catalogGameId} />
            <input name="durationMinutes" type="hidden" value={preset.value} />
            <input name="gameSlug" type="hidden" value={gameSlug} />
            <button className="queue2-button" data-tone="primary" type="submit">
              {preset.label}
            </button>
          </form>
        ))}
      </div>
      <form action={action} className="offline-custom-form">
        <input name="catalogGameId" type="hidden" value={catalogGameId} />
        <input name="gameSlug" type="hidden" value={gameSlug} />
        <label>
          <span>Mais tempo</span>
          <input
            inputMode="numeric"
            max={720}
            min={5}
            name="durationMinutes"
            placeholder="Minutos"
            type="number"
          />
        </label>
        <button className="queue2-button" data-tone="quiet" type="submit">
          Registrar
        </button>
      </form>
    </section>
  );
}
