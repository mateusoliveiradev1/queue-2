import type {
  GamificationAchievementsRecord,
  GamificationChallengesRecord,
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
  awardedAtIso: string;
};

export type RewardToastViewModel = {
  key: string;
  title: string;
  body: string;
  variant: "calm" | "special";
  inlineLabel: string;
};

export type AchievementRouteViewModel = {
  summaryCards: AchievementSummaryCardView[];
  totalLabel: string;
  unlockedLabel: string;
  hiddenLabel: string;
  updatedAtLabel: string;
  selectedRarity: GamificationRarity | null;
  filterOptions: AchievementRarityFilterOptionView[];
  groups: AchievementGroupView[];
  links: {
    dashboardHref: string;
    challengesHref: string;
  };
};

export type AchievementSummaryCardView = {
  label: string;
  value: string;
  detail: string;
  tone: "catalog" | "unlocked" | "secret";
};

export type AchievementRarityFilterOptionView = {
  label: string;
  href: string;
  selected: boolean;
  rarity: GamificationRarity | null;
};

export type AchievementGroupView = {
  group: string;
  label: string;
  progressLabel: string;
  progressPercent: number;
  achievements: AchievementCardView[];
};

export type AchievementCardView = {
  viewKey: string;
  title: string;
  description: string;
  rarity: GamificationRarity;
  rarityLabel: string;
  groupLabel: string;
  iconKey: string;
  state: "locked-visible" | "locked-hidden" | "unlocked";
  stateLabel: string;
  trailLabel: string;
  progressHint: string;
  unlockedAtLabel: string | null;
};

export type ChallengeRouteViewModel = {
  generatedAtLabel: string;
  timezoneLabel: string;
  selectedPeriod: QuestType | null;
  filterOptions: ChallengePeriodFilterOptionView[];
  streak: ChallengeStreakPanelViewModel;
  sections: ChallengeSectionViewModel[];
};

export type ChallengePeriodFilterOptionView = {
  label: string;
  href: string;
  selected: boolean;
  period: QuestType | null;
};

export type ChallengeStreakPanelViewModel = {
  state: "empty" | "active" | "freezing";
  title: string;
  valueLabel: string;
  supportLabel: string;
  freezeLabel: string;
  cutoffLabel: string;
  lastActivityLabel: string;
  nextCheckLabel: string;
  protectionLabel: string;
  assistiveLabel: string;
};

export type ChallengeSectionViewModel = {
  type: QuestType;
  title: string;
  description: string;
  expectedSlotsLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  quests: ChallengeQuestCardViewModel[];
};

export type ChallengeQuestCardViewModel = {
  slug: string;
  title: string;
  description: string;
  typeLabel: string;
  progressLabel: string;
  progressPercent: number;
  rewardLabel: string;
  windowLabel: string;
  freshnessLabel: string;
  statusLabel: string;
  completed: boolean;
  seasonalSealLabel: string | null;
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
      awardedAtLabel: formatDate(entry.awardedAt),
      awardedAtIso: entry.awardedAt.toISOString()
    })),
    links: {
      achievementsHref: "/app/conquistas",
      challengesHref: "/app/desafios"
    }
  };
}

export function toChallengeRouteView(
  challenges: GamificationChallengesRecord,
  buildHref: (period: QuestType | null) => string = defaultChallengeHref,
  selectedPeriod: QuestType | null = null
): ChallengeRouteViewModel {
  const visibleSections = challenges.sections
    .filter((section) => selectedPeriod === null || section.questType === selectedPeriod)
    .map((section) => toChallengeSectionView(section));

  return {
    generatedAtLabel: `Atualizado em ${formatDateTime(challenges.generatedAt)}`,
    timezoneLabel: `Janelas calculadas em ${challenges.timezone}`,
    selectedPeriod,
    filterOptions: [
      {
        label: "Todos",
        href: buildHref(null),
        selected: selectedPeriod === null,
        period: null
      },
      ...(["weekly", "monthly", "seasonal"] as const).map((period) => ({
        label: questTypePluralLabels[period],
        href: buildHref(period),
        selected: selectedPeriod === period,
        period
      }))
    ],
    streak: toChallengeStreakView(challenges.streak, challenges.timezone),
    sections: visibleSections
  };
}

export function toAchievementRouteView(
  achievements: GamificationAchievementsRecord,
  buildHref: (rarity: GamificationRarity | null) => string = defaultAchievementHref
): AchievementRouteViewModel {
  const totalLabel = `${formatNumber(achievements.totalCount)} conquistas sem placar individual`;
  const unlockedLabel = `${formatNumber(achievements.unlockedCount)} desbloqueadas pela dupla`;
  const hiddenLabel = `${formatNumber(achievements.hiddenLockedCount)} segredos ainda trancados`;

  return {
    summaryCards: [
      {
        label: "Acervo",
        value: formatNumber(achievements.totalCount),
        detail: "conquistas da dupla, sem disputa interna",
        tone: "catalog"
      },
      {
        label: "Memorias abertas",
        value: formatNumber(achievements.unlockedCount),
        detail: achievements.unlockedCount === 1
          ? "marco confirmado pelos dois"
          : "marcos confirmados pelos dois",
        tone: "unlocked"
      },
      {
        label: "Segredos",
        value: formatNumber(achievements.hiddenLockedCount),
        detail: "ocultos ate o fato certo acontecer",
        tone: "secret"
      }
    ],
    totalLabel,
    unlockedLabel,
    hiddenLabel,
    updatedAtLabel:
      achievements.unlockedCount > 0
        ? `Ultimo desbloqueio em ${formatDate(achievements.updatedAt)}`
        : "Sem desbloqueios confirmados ainda.",
    selectedRarity: achievements.selectedRarity,
    filterOptions: [
      {
        label: "Todas",
        href: buildHref(null),
        selected: achievements.selectedRarity === null,
        rarity: null
      },
      ...achievements.rarityOptions.map((rarity) => ({
        label: rarityLabels[rarity],
        href: buildHref(rarity),
        selected: achievements.selectedRarity === rarity,
        rarity
      }))
    ],
    groups: achievements.groups.map((group) => ({
      group: group.group,
      label: group.label,
      progressLabel: achievementGroupProgressLabel(group.achievements),
      progressPercent: achievementGroupProgressPercent(group.achievements),
      achievements: group.achievements.map((achievement) => ({
        viewKey: achievement.viewKey,
        title: achievement.title,
        description: achievement.description,
        rarity: achievement.rarity,
        rarityLabel: rarityLabels[achievement.rarity],
        groupLabel: group.label,
        iconKey: achievement.iconKey,
        state: achievement.state,
        stateLabel: achievementStateLabel(achievement.state),
        trailLabel: achievementTrailLabel(achievement.state),
        progressHint: achievement.progressHint,
        unlockedAtLabel: achievement.unlockedAt ? formatDate(achievement.unlockedAt) : null
      }))
    })),
    links: {
      dashboardHref: "/app",
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
      body: `${achievement.title} desbloqueada para os dois.`,
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

function toChallengeSectionView(
  section: GamificationChallengesRecord["sections"][number]
): ChallengeSectionViewModel {
  return {
    type: section.questType,
    title: challengeSectionLabels[section.questType].title,
    description: challengeSectionLabels[section.questType].description,
    expectedSlotsLabel: challengeSlotLabel(section.questType, section.expectedSlots),
    emptyTitle: challengeSectionLabels[section.questType].emptyTitle,
    emptyDescription: challengeSectionLabels[section.questType].emptyDescription,
    quests: section.quests.map(toChallengeQuestView)
  };
}

function achievementGroupProgressLabel(
  achievements: GamificationAchievementsRecord["groups"][number]["achievements"]
): string {
  const total = achievements.length;
  const unlocked = achievements.filter((achievement) => achievement.state === "unlocked").length;

  if (total === 0) {
    return "Sem conquistas neste filtro.";
  }

  return `${formatNumber(unlocked)}/${formatNumber(total)} memorias abertas neste grupo`;
}

function achievementGroupProgressPercent(
  achievements: GamificationAchievementsRecord["groups"][number]["achievements"]
): number {
  if (achievements.length === 0) {
    return 0;
  }

  const unlocked = achievements.filter((achievement) => achievement.state === "unlocked").length;

  return Math.round((unlocked / achievements.length) * 100);
}

function achievementStateLabel(state: AchievementCardView["state"]): string {
  if (state === "unlocked") {
    return "Memoria aberta";
  }

  if (state === "locked-hidden") {
    return "Segredo guardado";
  }

  return "Na fila da dupla";
}

function achievementTrailLabel(state: AchievementCardView["state"]): string {
  if (state === "unlocked") {
    return "Confirmada no servidor";
  }

  if (state === "locked-hidden") {
    return "Requisito oculto";
  }

  return "Progresso coletivo";
}

function toChallengeQuestView(
  quest: GamificationChallengesRecord["sections"][number]["quests"][number]
): ChallengeQuestCardViewModel {
  const goalValue = Math.max(quest.goalValue, 1);
  const currentValue = Math.min(Math.max(quest.currentValue, 0), goalValue);

  return {
    slug: quest.questSlug,
    title: quest.title,
    description: quest.description,
    typeLabel: questTypeLabels[quest.questType],
    progressLabel: quest.completed
      ? "Concluido pela dupla"
      : `${currentValue}/${goalValue} progresso confirmado`,
    progressPercent: Math.round((currentValue / goalValue) * 100),
    rewardLabel: `+${formatNumber(quest.xpReward)} XP da dupla`,
    windowLabel: `${formatDate(quest.windowStartAt)} ate ${formatDate(quest.windowEndAt)}`,
    freshnessLabel: `Renova em ${formatDate(quest.windowEndAt)} (${quest.timezone})`,
    statusLabel: quest.completed ? "Recompensa registrada" : "Em andamento leve",
    completed: quest.completed,
    seasonalSealLabel: quest.completed && quest.questType === "seasonal"
      ? `Selo ${quest.seasonalKey ?? "sazonal"} guardado na historia da dupla desde ${formatDate(quest.completedAt ?? quest.windowEndAt)}`
      : null
  };
}

function toChallengeStreakView(
  streak: GamificationChallengesRecord["streak"],
  timezone = "timezone da dupla"
): ChallengeStreakPanelViewModel {
  const nextCheckLabel = `Proxima manutencao diaria: ${formatHour(streak.cutoffHour)} (${timezone})`;

  if (streak.current > 0) {
    return {
      state: "active",
      title: "Chama da dupla",
      valueLabel: formatDays(streak.current),
      supportLabel: `Maior sequencia: ${formatDays(streak.longest)}`,
      freezeLabel:
        streak.availableFreezes > 0
          ? `${streak.availableFreezes} Streak Freeze em reserva`
          : "Sem Freeze em reserva agora",
      cutoffLabel: `Dia da dupla fecha as ${formatHour(streak.cutoffHour)}`,
      lastActivityLabel: streak.lastActivityDuoDay
        ? `Ultimo fato: ${formatDate(parseDuoDay(streak.lastActivityDuoDay))}`
        : "A proxima confirmacao registra o primeiro dia.",
      nextCheckLabel,
      protectionLabel:
        streak.availableFreezes > 0
          ? "Freeze cobre dias sem fato antes de qualquer reset."
          : "Sem Freeze: um fato real por duo-day mantem a chama.",
      assistiveLabel: `Streak coletivo ativo por ${formatDays(streak.current)}.`
    };
  }

  if (streak.availableFreezes > 0) {
    return {
      state: "freezing",
      title: "Freeze pronto",
      valueLabel: "0 dias",
      supportLabel: "A reserva existe para manter o ritual tranquilo.",
      freezeLabel: `${streak.availableFreezes} Streak Freeze em reserva`,
      cutoffLabel: `Dia da dupla fecha as ${formatHour(streak.cutoffHour)}`,
      lastActivityLabel: streak.lastActivityDuoDay
        ? `Ultimo fato: ${formatDate(parseDuoDay(streak.lastActivityDuoDay))}`
        : "Sem sequencia confirmada ainda.",
      nextCheckLabel,
      protectionLabel: "Freeze fica guardado ate existir uma sequencia para proteger.",
      assistiveLabel: "A dupla tem Streak Freeze em reserva, sem cobranca por atividade."
    };
  }

  return {
    state: "empty",
    title: "Streak em espera",
    valueLabel: "0 dias",
    supportLabel: "Comeca com sessoes, capitulos ou combinados confirmados.",
    freezeLabel: "Streak Freeze chega a cada dez niveis.",
    cutoffLabel: `Dia da dupla fecha as ${formatHour(streak.cutoffHour)}`,
    lastActivityLabel: "Nenhum fato de streak confirmado ainda.",
    nextCheckLabel,
    protectionLabel: "A primeira sessao, capitulo ou combinado confirmado abre a sequencia.",
    assistiveLabel: "Nenhuma sequencia confirmada ainda."
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

function defaultAchievementHref(rarity: GamificationRarity | null): string {
  return rarity ? `/app/conquistas?raridade=${rarity}` : "/app/conquistas";
}

function defaultChallengeHref(period: QuestType | null): string {
  const params: Record<QuestType, string> = {
    weekly: "semana",
    monthly: "mes",
    seasonal: "sazonal"
  };

  return period ? `/app/desafios?periodo=${params[period]}` : "/app/desafios";
}

const questTypeLabels: Record<QuestType, string> = {
  weekly: "Semanal",
  monthly: "Mensal",
  seasonal: "Sazonal"
};

const questTypePluralLabels: Record<QuestType, string> = {
  weekly: "Semana",
  monthly: "Mes",
  seasonal: "Sazonais"
};

const challengeSectionLabels: Record<
  QuestType,
  {
    title: string;
    description: string;
    emptyTitle: string;
    emptyDescription: string;
  }
> = {
  weekly: {
    title: "Tres desafios da semana",
    description:
      "Pequenos convites para a dupla manter a fila viva com fatos confirmados.",
    emptyTitle: "A semana ainda vai entrar na fila",
    emptyDescription:
      "Quando a rotacao semanal rodar, tres convites aparecem aqui sem guardar historico de incompletos."
  },
  monthly: {
    title: "Desafio do mes",
    description:
      "Um marco um pouco maior para celebrar constancia sem transformar lazer em lista.",
    emptyTitle: "O mes ainda nao tem desafio ativo",
    emptyDescription:
      "A proxima manutencao cria o ciclo mensal para a dupla no timezone configurado."
  },
  seasonal: {
    title: "Sazonais no ar",
    description:
      "Spooky, Awards e aniversario aparecem quando o calendario da dupla combina com o ciclo.",
    emptyTitle: "Nenhum sazonal ativo agora",
    emptyDescription:
      "Sazonais entram como eventos explicitos; quando passam, nao deixam marca de pendencia."
  }
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

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function parseDuoDay(duoDay: string): Date {
  return new Date(`${duoDay}T00:00:00.000Z`);
}

function challengeSlotLabel(questType: QuestType, expectedSlots: number): string {
  if (questType === "weekly") {
    return `${expectedSlots} slots semanais`;
  }

  if (questType === "monthly") {
    return "1 slot mensal";
  }

  return "Sementes sazonais explicitas";
}
