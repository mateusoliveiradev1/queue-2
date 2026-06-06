import type { CSSProperties } from "react";

import { XpLedgerPanel } from "./xp-ledger-panel";
import type {
  GamificationAchievementView,
  GamificationDashboardViewModel,
  GamificationQuestView
} from "./view-models";

export function GamificationDashboardBand({
  view
}: {
  view: GamificationDashboardViewModel;
}) {
  return (
    <section
      aria-labelledby="gamification-dashboard-title"
      className="gamification-dashboard-band app-section"
      data-empty={view.empty ? "true" : "false"}
    >
      <div className="gamification-band-heading">
        <div>
          <p className="eyebrow">Gamificacao</p>
          <h2 id="gamification-dashboard-title">Progresso da dupla</h2>
          <p className="support-copy">
            XP, streak, desafios e conquistas aparecem como um placar unico dos dois.
          </p>
        </div>
        <div className="gamification-band-actions" aria-label="Superficies completas">
          <a className="queue2-button" data-tone="quiet" href={view.links.achievementsHref}>
            Conquistas
          </a>
          <a className="queue2-button" data-tone="quiet" href={view.links.challengesHref}>
            Desafios
          </a>
        </div>
      </div>

      <div className="gamification-band-layout">
        <div className="gamification-level-panel">
          <div>
            <span className="muted">{view.levelLabel}</span>
            <strong>{view.levelName}</strong>
          </div>
          <span className="gamification-xp-total">{view.xpLabel}</span>
          <div
            aria-label={view.progressLabel}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={view.progressPercent}
            className="gamification-progress"
            role="progressbar"
            style={{ "--gamification-progress": `${view.progressPercent}%` } as CSSProperties}
          >
            <span aria-hidden="true" />
          </div>
          <p className="support-copy">{view.progressLabel}</p>
          <p className="muted">{view.updatedAtLabel}</p>
        </div>

        <div
          aria-label={view.streak.assistiveLabel}
          className="gamification-streak-panel"
          data-state={view.streak.state}
        >
          <span className="gamification-streak-mark" aria-hidden="true" />
          <div>
            <span className="muted">{view.streak.label}</span>
            <strong>{view.streak.valueLabel}</strong>
            <p>{view.streak.freezeLabel}</p>
          </div>
        </div>
      </div>

      {view.empty ? (
        <p className="gamification-empty-line">
          Confirmem uma sessao, concluam um capitulo ou fechem um desafio para abrir
          o primeiro registro de XP.
        </p>
      ) : null}

      <div className="gamification-summary-grid">
        <section className="gamification-summary-column" aria-labelledby="active-quests-title">
          <div className="gamification-subheading">
            <p className="eyebrow">Desafios ativos</p>
            <h3 id="active-quests-title">Tres combinados em foco</h3>
          </div>
          {view.quests.length ? (
            <ol className="gamification-quest-list">
              {view.quests.map((quest) => (
                <QuestRow key={quest.slug} quest={quest} />
              ))}
            </ol>
          ) : (
            <p className="gamification-empty-line">
              Desafios aparecem aqui quando a rotacao da dupla estiver ativa.
            </p>
          )}
        </section>

        <section className="gamification-summary-column" aria-labelledby="achievements-title">
          <div className="gamification-subheading">
            <p className="eyebrow">Conquistas recentes</p>
            <h3 id="achievements-title">Marcos que ja viraram memoria</h3>
          </div>
          {view.achievements.length ? (
            <ol className="gamification-achievement-list">
              {view.achievements.map((achievement) => (
                <AchievementRow achievement={achievement} key={achievement.slug} />
              ))}
            </ol>
          ) : (
            <p className="gamification-empty-line">
              As conquistas recentes aparecem depois dos primeiros fatos confirmados.
            </p>
          )}
        </section>

        <XpLedgerPanel entries={view.ledger} />
      </div>
    </section>
  );
}

function QuestRow({ quest }: { quest: GamificationQuestView }) {
  return (
    <li className="gamification-quest-row" data-completed={quest.completed ? "true" : "false"}>
      <div>
        <span className="muted">{quest.typeLabel}</span>
        <strong>{quest.title}</strong>
        <p>{quest.description}</p>
      </div>
      <div className="gamification-quest-progress">
        <span>{quest.progressLabel}</span>
        <div
          aria-hidden="true"
          className="gamification-mini-progress"
          style={{ "--gamification-progress": `${quest.progressPercent}%` } as CSSProperties}
        >
          <span />
        </div>
        <time>{quest.resetLabel}</time>
      </div>
    </li>
  );
}

function AchievementRow({
  achievement
}: {
  achievement: GamificationAchievementView;
}) {
  return (
    <li className="gamification-achievement-row" data-rarity={achievement.rarity}>
      <span className="gamification-achievement-mark" aria-hidden="true" />
      <div>
        <strong>{achievement.title}</strong>
        <span>
          {achievement.rarityLabel} - {achievement.unlockedAtLabel}
        </span>
      </div>
    </li>
  );
}
