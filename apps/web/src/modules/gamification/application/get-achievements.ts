import {
  ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_GROUP_LABELS,
  ACHIEVEMENT_GROUPS,
  type AchievementGroup,
  type AchievementSeed
} from "../domain/achievement-catalog";
import {
  GAMIFICATION_RARITIES,
  type GamificationRarity
} from "../domain/gamification-policy";
import type {
  GamificationAchievementReadModel,
  GamificationAchievementsRecord,
  GamificationRepository,
  GamificationRepositoryTransaction,
  GamificationUserId
} from "./ports";

export async function getAchievements(
  input: {
    userId: GamificationUserId;
    rarity?: GamificationRarity | null;
  },
  repository?: GamificationRepository
): Promise<GamificationAchievementsRecord | null> {
  const resolvedRepository =
    repository ?? (await import("../infrastructure/gamification-repository")).gamificationRepository;

  return resolvedRepository.withUserTransaction(input.userId, async (transaction) =>
    getAchievementsFromTransaction(input, transaction)
  );
}

export async function getAchievementsFromTransaction(
  input: {
    userId: GamificationUserId;
    rarity?: GamificationRarity | null;
  },
  transaction: GamificationRepositoryTransaction
): Promise<GamificationAchievementsRecord | null> {
  const membership = await transaction.resolveMembership(input.userId);

  if (!membership) {
    return null;
  }

  const unlocks = await transaction.readAchievementUnlocks(membership.duoId);
  const unlocksBySlug = new Map(
    unlocks.map((unlock) => [unlock.achievementSlug, unlock])
  );
  const filteredSeeds = ACHIEVEMENT_CATALOG.filter((seed) =>
    input.rarity ? seed.rarity === input.rarity : true
  );
  const achievements = filteredSeeds.map((seed, index) =>
    toAchievementReadModel(seed, unlocksBySlug.get(seed.slug), index)
  );
  const groups = ACHIEVEMENT_GROUPS.map((group) => ({
    group,
    label: ACHIEVEMENT_GROUP_LABELS[group],
    achievements: achievements.filter((achievement) => achievement.group === group)
  })).filter((group) => group.achievements.length > 0);
  const latestUnlock = unlocks.reduce<Date | null>((latest, unlock) => {
    if (!latest || unlock.unlockedAt.getTime() > latest.getTime()) {
      return unlock.unlockedAt;
    }

    return latest;
  }, null);

  return {
    duoId: membership.duoId,
    selectedRarity: input.rarity ?? null,
    rarityOptions: [...GAMIFICATION_RARITIES],
    totalCount: ACHIEVEMENT_CATALOG.length,
    visibleCount: ACHIEVEMENT_CATALOG.filter((seed) => seed.visibility === "visible").length,
    unlockedCount: unlocks.length,
    hiddenLockedCount: achievements.filter((achievement) => achievement.state === "locked-hidden").length,
    groups,
    updatedAt: latestUnlock ?? new Date(0)
  };
}

function toAchievementReadModel(
  seed: AchievementSeed,
  unlock: Awaited<ReturnType<GamificationRepositoryTransaction["readAchievementUnlocks"]>>[number] | undefined,
  index: number
): GamificationAchievementReadModel {
  if (!unlock && seed.visibility === "hidden") {
    return {
      viewKey: `misterio-${index + 1}`,
      slug: null,
      group: seed.group,
      rarity: seed.rarity,
      visibility: seed.visibility,
      state: "locked-hidden",
      title: "Conquista oculta",
      description:
        "Um marco raro fica em segredo ate a dupla registrar o fato certo no servidor.",
      iconKey: "badge-mystery",
      progressHint:
        "O requisito permanece oculto; a pagina mostra so que existe um segredo nesse grupo.",
      unlockedAt: null
    };
  }

  return {
    viewKey: seed.slug,
    slug: seed.slug,
    group: seed.group,
    rarity: seed.rarity,
    visibility: seed.visibility,
    state: unlock ? "unlocked" : "locked-visible",
    title: seed.title,
    description: seed.description,
    iconKey: seed.iconKey,
    progressHint: unlock
      ? "Desbloqueada por um fato confirmado da dupla; IDs e origem tecnica ficam no servidor."
      : getSafeProgressHint(seed.group),
    unlockedAt: unlock?.unlockedAt ?? null
  };
}

function getSafeProgressHint(group: AchievementGroup): string {
  switch (group) {
    case "story":
      return "Continuem registrando sessoes, capitulos e finais confirmados pela dupla.";
    case "coop-sincronia":
      return "Sinais de sintonia aparecem quando os dois confirmam acoes reais no mesmo ritual.";
    case "compromisso":
      return "Agendamentos, presencas e desafios concluidos movimentam este grupo.";
    case "descoberta":
      return "Matches reais e escolhas que viram fila alimentam este caminho.";
    case "streak":
      return "Duo-days com fatos confirmados mantem a sequencia sem cobranca individual.";
    case "roleta":
      return "Reservada para momentos de escolha autoritativa quando a roleta entrar na fila.";
    case "comedia":
      return "Momentos improvaveis aparecem sem punicao, vergonha ou comparacao interna.";
  }
}
