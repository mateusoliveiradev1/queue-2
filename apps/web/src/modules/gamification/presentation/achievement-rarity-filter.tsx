import type { AchievementRarityFilterOptionView } from "./view-models";

export function AchievementRarityFilter({
  options
}: {
  options: AchievementRarityFilterOptionView[];
}) {
  return (
    <nav
      aria-label="Filtrar conquistas por raridade"
      className="achievement-rarity-filter"
    >
      {options.map((option) => (
        <a
          aria-current={option.selected ? "page" : undefined}
          className="queue2-focusable"
          data-rarity={option.rarity ?? "all"}
          href={option.href}
          key={option.rarity ?? "all"}
        >
          {option.label}
        </a>
      ))}
    </nav>
  );
}
