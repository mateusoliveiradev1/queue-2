import type { GamificationLedgerEntryView } from "./view-models";

export function XpLedgerPanel({
  entries
}: {
  entries: GamificationLedgerEntryView[];
}) {
  return (
    <section className="xp-ledger-panel" aria-labelledby="xp-ledger-title">
      <div className="gamification-subheading">
        <p className="eyebrow">Historico</p>
        <h3 id="xp-ledger-title">XP que entrou na fila</h3>
      </div>
      {entries.length ? (
        <ol className="xp-ledger-list" aria-label="Historico recente de XP da dupla">
          {entries.map((entry) => (
            <li className="xp-ledger-entry" key={entry.id}>
              <span className="xp-ledger-entry__reason">{entry.reasonLabel}</span>
              <strong>{entry.amountLabel}</strong>
              <time dateTime={entry.awardedAtIso}>{entry.awardedAtLabel}</time>
            </li>
          ))}
        </ol>
      ) : (
        <p className="gamification-empty-line">
          O historico nasce quando o servidor registra XP compartilhado.
        </p>
      )}
    </section>
  );
}
