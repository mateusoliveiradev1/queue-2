import type { ChallengeStreakPanelViewModel } from "./view-models";

export function StreakPanel({
  streak
}: {
  streak: ChallengeStreakPanelViewModel;
}) {
  return (
    <section
      aria-label={streak.assistiveLabel}
      className="challenge-streak-panel"
      data-state={streak.state}
    >
      <span className="challenge-streak-mark" aria-hidden="true" />
      <div className="challenge-streak-copy">
        <p className="eyebrow">Streak coletivo</p>
        <h2>{streak.title}</h2>
        <strong>{streak.valueLabel}</strong>
        <p>{streak.supportLabel}</p>
      </div>
      <dl className="challenge-streak-meta">
        <div>
          <dt>Freeze</dt>
          <dd>{streak.freezeLabel}</dd>
        </div>
        <div>
          <dt>Protecao</dt>
          <dd>{streak.protectionLabel}</dd>
        </div>
        <div>
          <dt>Ritmo</dt>
          <dd>{streak.nextCheckLabel}</dd>
        </div>
        <div>
          <dt>Ultimo fato</dt>
          <dd>{streak.lastActivityLabel}</dd>
        </div>
      </dl>
    </section>
  );
}
