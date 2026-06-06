import { AchievementBadgeIcon } from "./achievement-badge-icon";
import { AchievementRarityFilter } from "./achievement-rarity-filter";
import type {
  AchievementCardView,
  AchievementRouteViewModel
} from "./view-models";

export function AchievementGrid({
  view
}: {
  view: AchievementRouteViewModel;
}) {
  return (
    <section className="achievements-route" aria-labelledby="achievements-route-title">
      <div className="achievements-summary-grid" aria-label="Resumo de conquistas">
        <div>
          <span className="muted">Catalogo</span>
          <strong>{view.totalLabel}</strong>
        </div>
        <div>
          <span className="muted">Historico</span>
          <strong>{view.unlockedLabel}</strong>
        </div>
        <div>
          <span className="muted">Segredos</span>
          <strong>{view.hiddenLabel}</strong>
        </div>
      </div>

      <div className="achievement-filter-bar">
        <div>
          <p className="eyebrow">Raridade</p>
          <p className="support-copy">{view.updatedAtLabel}</p>
        </div>
        <AchievementRarityFilter options={view.filterOptions} />
      </div>

      <div className="achievement-group-list">
        {view.groups.map((group) => (
          <section
            className="achievement-group"
            key={group.group}
            aria-labelledby={`achievement-group-${group.group}`}
          >
            <div className="section-heading">
              <p className="eyebrow">Grupo</p>
              <h2 id={`achievement-group-${group.group}`}>{group.label}</h2>
            </div>
            <ol className="achievement-card-grid">
              {group.achievements.map((achievement) => (
                <AchievementCard achievement={achievement} key={achievement.viewKey} />
              ))}
            </ol>
          </section>
        ))}
      </div>
    </section>
  );
}

function AchievementCard({
  achievement
}: {
  achievement: AchievementCardView;
}) {
  const locked = achievement.state !== "unlocked";
  const describedBy = `${achievement.viewKey}-hint`;

  return (
    <li>
      <article
        aria-describedby={describedBy}
        className="achievement-card queue2-focusable"
        data-rarity={achievement.rarity}
        data-state={achievement.state}
        tabIndex={0}
      >
        <AchievementBadgeIcon
          iconKey={achievement.iconKey}
          label={`${achievement.title}, ${achievement.rarityLabel}`}
          locked={locked}
          rarity={achievement.rarity}
        />
        <div className="achievement-card__copy">
          <div>
            <p className="eyebrow">
              {achievement.groupLabel} / {achievement.rarityLabel}
            </p>
            <h3>{achievement.title}</h3>
            <p>{achievement.description}</p>
          </div>
          <div className="achievement-card__meta">
            <span>{achievement.stateLabel}</span>
            {achievement.unlockedAtLabel ? (
              <time>{achievement.unlockedAtLabel}</time>
            ) : null}
          </div>
          <p className="achievement-card__hint" id={describedBy}>
            {achievement.progressHint}
          </p>
        </div>
      </article>
    </li>
  );
}
