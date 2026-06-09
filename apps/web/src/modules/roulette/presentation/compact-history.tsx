import type { RouletteHistoryItemViewModel } from "./view-models";

export function CompactHistory({
  emptyLabel,
  heading,
  items
}: {
  emptyLabel: string;
  heading: string;
  items: RouletteHistoryItemViewModel[];
}) {
  return (
    <section className="roulette-compact-history" aria-labelledby="roulette-history-title">
      <div className="section-heading">
        <h2 id="roulette-history-title">{heading || "Historico da roleta"}</h2>
        <p className="support-copy">
          {items.length ? "boost, pity, locked e discarded ficam visiveis para confianca." : emptyLabel}
        </p>
      </div>
      {items.length > 0 ? (
        <ol className="roulette-history-list" aria-label="Historico compacto da roleta" tabIndex={0}>
          {items.map((item) => (
            <li data-outcome={item.outcome} data-rarity={item.rarity} key={item.id}>
              <span>{item.eventLabel}</span>
              <time>{item.occurredAtLabel}</time>
              <small>{item.summaryLabel}</small>
            </li>
          ))}
        </ol>
      ) : (
        <p className="roulette-history-empty">
          {emptyLabel || "Os sorteios aparecem aqui depois da primeira rodada."}
        </p>
      )}
    </section>
  );
}
