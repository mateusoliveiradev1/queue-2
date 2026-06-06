import type { CSSProperties } from "react";

import type {
  ChallengePeriodFilterOptionView,
  ChallengeQuestCardViewModel,
  ChallengeRouteViewModel,
  ChallengeSectionViewModel
} from "./view-models";

export function ChallengeBoard({
  view
}: {
  view: ChallengeRouteViewModel;
}) {
  return (
    <section className="challenge-board" aria-labelledby="challenges-route-title">
      <div className="challenge-filter-bar">
        <div>
          <p className="eyebrow">Periodo</p>
          <p className="support-copy">{view.generatedAtLabel}</p>
          <p className="muted">{view.timezoneLabel}</p>
        </div>
        <ChallengePeriodFilter options={view.filterOptions} />
      </div>

      <div className="challenge-section-list">
        {view.sections.map((section) => (
          <ChallengeSection key={section.type} section={section} />
        ))}
      </div>
    </section>
  );
}

function ChallengePeriodFilter({
  options
}: {
  options: ChallengePeriodFilterOptionView[];
}) {
  return (
    <nav aria-label="Filtrar desafios por periodo" className="challenge-period-filter">
      {options.map((option) => (
        <a
          aria-current={option.selected ? "page" : undefined}
          className="queue2-focusable"
          data-period={option.period ?? "all"}
          href={option.href}
          key={option.period ?? "all"}
        >
          {option.label}
        </a>
      ))}
    </nav>
  );
}

function ChallengeSection({
  section
}: {
  section: ChallengeSectionViewModel;
}) {
  return (
    <section
      className="challenge-section"
      data-period={section.type}
      aria-labelledby={`challenge-section-${section.type}`}
    >
      <div className="section-heading">
        <p className="eyebrow">{section.expectedSlotsLabel}</p>
        <h2 id={`challenge-section-${section.type}`}>{section.title}</h2>
        <p>{section.description}</p>
      </div>

      {section.quests.length ? (
        <ol className="challenge-card-grid">
          {section.quests.map((quest) => (
            <ChallengeCard key={`${quest.slug}:${quest.windowLabel}`} quest={quest} />
          ))}
        </ol>
      ) : (
        <div className="challenge-empty-state">
          <strong>{section.emptyTitle}</strong>
          <p>{section.emptyDescription}</p>
        </div>
      )}
    </section>
  );
}

function ChallengeCard({
  quest
}: {
  quest: ChallengeQuestCardViewModel;
}) {
  return (
    <li>
      <article
        className="challenge-card queue2-focusable"
        data-completed={quest.completed ? "true" : "false"}
        tabIndex={0}
      >
        <div className="challenge-card-heading">
          <div>
            <p className="eyebrow">{quest.typeLabel}</p>
            <h3>{quest.title}</h3>
          </div>
          <span>{quest.rewardLabel}</span>
        </div>
        <p>{quest.description}</p>
        <div
          aria-label={quest.progressLabel}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={quest.progressPercent}
          className="challenge-progress"
          role="progressbar"
          style={{ "--challenge-progress": `${quest.progressPercent}%` } as CSSProperties}
        >
          <span aria-hidden="true" />
        </div>
        <div className="challenge-card-meta">
          <span>{quest.progressLabel}</span>
          <span>{quest.statusLabel}</span>
          <time>{quest.windowLabel}</time>
          <span>{quest.freshnessLabel}</span>
        </div>
        {quest.seasonalSealLabel ? (
          <p className="challenge-seasonal-seal">{quest.seasonalSealLabel}</p>
        ) : null}
      </article>
    </li>
  );
}
