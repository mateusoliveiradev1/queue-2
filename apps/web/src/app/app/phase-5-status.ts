import type { RewardToastViewModel } from "../../modules/gamification";

const rewardStatuses = {
  "level-up": {
    key: "level-up",
    title: "Nivel novo da dupla",
    body: "O XP veio de fatos confirmados e o painel ja mostra o novo marco.",
    variant: "special",
    inlineLabel: "Level-up registrado para a dupla."
  },
  conquista: {
    key: "conquista",
    title: "Conquista da dupla",
    body: "Um marco compartilhado entrou no historico dos dois.",
    variant: "special",
    inlineLabel: "Conquista desbloqueada para os dois."
  },
  "desafio-completo": {
    key: "desafio-completo",
    title: "Desafio concluido",
    body: "A recompensa foi registrada como progresso coletivo.",
    variant: "special",
    inlineLabel: "Desafio concluido pela dupla."
  },
  "xp-registrado": {
    key: "xp-registrado",
    title: "XP da dupla atualizado",
    body: "O servidor registrou XP compartilhado para a fila.",
    variant: "calm",
    inlineLabel: "XP compartilhado atualizado."
  }
} as const satisfies Record<string, RewardToastViewModel>;

export type Phase5RewardStatus = keyof typeof rewardStatuses;

export function getPhase5RewardStatus(
  value: string | null
): RewardToastViewModel | null {
  if (!value || !isPhase5RewardStatus(value)) {
    return null;
  }

  return rewardStatuses[value];
}

export function isPhase5RewardStatus(value: string): value is Phase5RewardStatus {
  return Object.hasOwn(rewardStatuses, value);
}
