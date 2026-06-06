import type {
  GamificationDashboardRecord,
  GamificationRewardSummary
} from "../application/ports";
import type {
  GamificationFactSourceType,
  GamificationRarity
} from "../domain/gamification-policy";
import type { QuestType } from "../domain/quest-catalog";

export type GamificationDashboardViewModel = {
  empty: boolean;
  xpLabel: string;
  levelLabel: string;
  levelName: string;
  progressLabel: string;
  progressPercent: number;
  updatedAtLabel: string;
  streak: GamificationStreakView;
  quests: GamificationQuestView[];
  achievements: GamificationAchievementView[];
  ledger: GamificationLedgerEntryView[];
  links: {
    achievementsHref: string;
    challengesHref: string;
  };
};

export type GamificationStreakView = {
  state: "empty" | "active" | "freezing";
  label: string;
  valueLabel: string;
  freezeLabel: string;
  assistiveLabel: string;
};

export type GamificationQuestView = {
  slug: string;
  typeLabel: string;
  title: string;
  description: string;
  progressLabel: string;
  progressPercent: number;
  completed: boolean;
  resetLabel: string;
};

export type GamificationAchievementView = {
  slug: string;
  title: string;
  rarity: GamificationRarity;
  rarityLabel: string;
  unlockedAtLabel: string;
};

export type GamificationLedgerEntryView = {
  id: string;
  amountLabel: string;
  reasonLabel: string;
  awardedAtLabel: string;
};

export type RewardToastViewModel = {
  key: string;
  title: string;
  body: string;
  variant: "calm" | "special";
  inlineLabel: string;
};

export function toGamificationDashboardView(
  dashboard: GamificationDashboardRecord | null
): GamificationDashboardViewModel {
  if (!dashboard) {
    return emptyDashboardView();
  }

  const empty =
    dashboard.xp === 0
    && dashboard.streak.current === 0
    && dashboard.activeQuests.length === 0
    && dashboard.recentAchievements.length === 0
    && dashboard.recentLedger.length === 0;

  return {
    empty,
    xpLabel: `${formatNumber(dashboard.xp)} XP da dupla`,
    levelLabel: `Nivel ${dashboard.level.level}`,
    levelName: dashboard.level.name,
    progressLabel: dashboard.nextLevel
      ? `${formatNumber(dashboard.xpIntoLevel)}/${formatNumber(dashboard.xpForNextLevel)} XP ate ${dashboard.nextLevel.name}`
      : "A dupla chegou ao topo da curva v1.",
    progressPercent: Math.round(dashboard.progressRatio * 100),
    updatedAtLabel: `Atualizado em ${formatDate(dashboard.updatedAt)}`,
    streak: toStreakView(dashboard.streak),
    quests: dashboard.activeQuests.map(toQuestView),
    achievements: dashboard.recentAchievements.map((achievement) => ({
      slug: achievement.slug,
      title: achievement.title,
      rarity: achievement.rarity,
      rarityLabel: rarityLabels[achievement.rarity],
      unlockedAtLabel: formatDate(achievement.unlockedAt)
    })),
    ledger: dashboard.recentLedger.map((entry) => ({
      id: entry.id,
      amountLabel: `${entry.amount > 0 ? "+" : ""}${formatNumber(entry.amount)} XP`,
      reasonLabel: ledgerReasonLabel(entry.reasonCode, entry.sourceType),
      awardedAtLabel: formatDate(entry.awardedAt)
    })),
    links: {
      achievementsHref: "/app/conquistas",
      challengesHref: "/app/desafios"
    }
  };
}

export function toRewardToastView(
  summary: GamificationRewardSummary | null
): RewardToastViewModel | null {
  if (!summary) {
    return null;
  }

  if (summary.levelUp) {
    return {
      key: `level-up:${summary.levelUp.currentLevel.level}`,
      title: `Nivel ${summary.levelUp.currentLevel.level} da dupla`,
      body: `${summary.levelUp.currentLevel.name} entrou na fila. XP confirmado no servidor.`,
      variant: "special",
      inlineLabel: "Level-up registrado no painel da dupla."
    };
  }

  const achievement = summary.achievements[0];

  if (achievement) {
    return {
      key: `achievement:${achievement.slug}:${achievement.unlockedAt.toISOString()}`,
      title: "Conquista da dupla",
      body: `${achievement.title} desbloqueada sem ranking interno.`,
      variant: "special",
      inlineLabel: "Conquista desbloqueada para os dois."
    };
  }

  const completedQuest = summary.questProgress.find((quest) => quest.completed);

  if (completedQuest) {
    return {
      key: `quest:${completedQuest.questSlug}:${completedQuest.cycleKey}`,
      title: "Desafio concluido",
      body: "A recompensa foi registrada como progresso compartilhado.",
      variant: "special",
      inlineLabel: "Desafio concluido pela dupla."
    };
  }

  if (summary.totalXpAwarded > 0) {
    return {
      key: `xp:${summary.projection.updatedAt.toISOString()}:${summary.totalXpAwarded}`,
      title: `${formatNumber(summary.totalXpAwarded)} XP da dupla`,
      body: "XP registrado por um fato confirmado, sem pontuacao individual.",
      variant: "calm",
      inlineLabel: "XP compartilhado atualizado."
    };
  }

  return null;
}

function emptyDashboardView(): GamificationDashboardViewModel {
  return {
    empty: true,
    xpLabel: "0 XP da dupla",
    levelLabel: "Nivel 1",
    levelName: "Lv1 Casuais",
    progressLabel: "O primeiro XP vem de sessoes, capitulos e combinados confirmados.",
    progressPercent: 0,
    updatedAtLabel: "Sem historico de XP ainda.",
    streak: {
      state: "empty",
      label: "Streak em espera",
      valueLabel: "0 dias",
      freezeLabel: "Sem Freeze em reserva",
      assistiveLabel: "Nenhuma sequencia confirmada ainda."
    },
    quests: [],
    achievements: [],
    ledger: [],
    links: {
      achievementsHref: "/app/conquistas",
      challengesHref: "/app/desafios"
    }
  };
}

function toStreakView(streak: {
  current: number;
  availableFreezes: number;
}): GamificationStreakView {
  if (streak.current > 0) {
    return {
      state: "active",
      label: "Chama ativa",
      valueLabel: formatDays(streak.current),
      freezeLabel:
        streak.availableFreezes > 0
          ? `${streak.availableFreezes} Streak Freeze em reserva`
          : "Sem Freeze em reserva",
      assistiveLabel: `Streak coletivo ativo por ${formatDays(streak.current)}.`
    };
  }

  if (streak.availableFreezes > 0) {
    return {
      state: "freezing",
      label: "Freeze em reserva",
      valueLabel: "0 dias",
      freezeLabel: `${streak.availableFreezes} Streak Freeze protege a sequencia quando fizer sentido`,
      assistiveLabel: "A dupla tem Streak Freeze em reserva, sem cobranca por atividade."
    };
  }

  return {
    state: "empty",
    label: "Streak em espera",
    valueLabel: "0 dias",
    freezeLabel: "Sem Freeze em reserva",
    assistiveLabel: "A sequencia comeca quando a dupla confirma um fato real."
  };
}

function toQuestView(quest: GamificationDashboardRecord["activeQuests"][number]): GamificationQuestView {
  const goalValue = Math.max(quest.goalValue, 1);
  const currentValue = Math.min(Math.max(quest.currentValue, 0), goalValue);

  return {
    slug: quest.questSlug,
    typeLabel: questTypeLabels[quest.questType],
    title: quest.title,
    description: quest.description,
    progressLabel: quest.completed
      ? "Concluido pela dupla"
      : `${currentValue}/${goalValue} combinado`,
    progressPercent: Math.round((currentValue / goalValue) * 100),
    completed: quest.completed,
    resetLabel: `Renova em ${formatDate(quest.windowEndAt)}`
  };
}

function ledgerReasonLabel(
  reasonCode: string,
  sourceType: GamificationFactSourceType
): string {
  if (reasonCode === "quest-complete" || sourceType === "quest") {
    return "Desafio concluido pela dupla";
  }

  switch (sourceType) {
    case "chapter":
      return "Capitulo concluido na jornada";
    case "live-session":
      return "Sessao ao vivo confirmada";
    case "offline-session":
      return "Jogamos Hoje confirmado";
    case "scheduled-session":
      return "Presenca confirmada na sessao marcada";
    case "terminal-zerado":
      return "Zerado confirmado pelos dois";
    case "terminal-dropado":
      return "Dropado registrado sem punicao";
    case "achievement":
      return "Conquista desbloqueada";
    case "streak":
      return "Streak preservado pela dupla";
    case "adjustment":
      return "Ajuste auditado no XP compartilhado";
    case "discovery-match":
      return "Match real entrou no ritual";
    default:
      return "Progresso compartilhado registrado";
  }
}

const questTypeLabels: Record<QuestType, string> = {
  weekly: "Semanal",
  monthly: "Mensal",
  seasonal: "Sazonal"
};

const rarityLabels: Record<GamificationRarity, string> = {
  common: "Comum",
  rare: "Rara",
  epic: "Epica",
  legendary: "Lendaria"
};

function formatDays(days: number): string {
  return `${formatNumber(days)} ${days === 1 ? "dia" : "dias"}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}
