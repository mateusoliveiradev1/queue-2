export const LEVEL_CURVE_VERSION = "queue2-level-curve-v1";
export const LEVEL_CURVE_MULTIPLIER = 1.18;
export const LEVEL_COUNT = 50;

const BASE_LEVEL_STEP_XP = 120;

export type LevelDefinition = {
  level: number;
  name: string;
  xpRequired: number;
};

export const LEVEL_NAMES = [
  "Lv1 Casuais",
  "Lv2 Dupla de Sofa",
  "Lv3 Primeiro Save",
  "Lv4 Controle Dividido",
  "Lv5 Checkpoint Juntos",
  "Lv6 Parceiros de Lobby",
  "Lv7 Combo Simples",
  "Lv8 Rota Marcada",
  "Lv9 Sincronia Inicial",
  "Lv10 Pacto da Fila",
  "Lv11 Dois no Mesmo Ritmo",
  "Lv12 Plano de Sabado",
  "Lv13 Revive Garantido",
  "Lv14 Boss em Dupla",
  "Lv15 Tropa do Coop",
  "Lv16 Fila Azeitada",
  "Lv17 Timing Fino",
  "Lv18 Mapa Decorado",
  "Lv19 Squad de Dois",
  "Lv20 Alianca do Sofa",
  "Lv21 Checkpoint Vivo",
  "Lv22 Turno da Madrugada",
  "Lv23 Estrategia Cruzada",
  "Lv24 Rota Sem Panico",
  "Lv25 Meio Caminho Lendario",
  "Lv26 Combo de Confianca",
  "Lv27 Dupla Blindada",
  "Lv28 Ritmo de Campanha",
  "Lv29 Inventario Compartilhado",
  "Lv30 Veteranos da Fila",
  "Lv31 Save Sagrado",
  "Lv32 Mestre do Revezamento",
  "Lv33 Boss Sem Drama",
  "Lv34 Coop de Precisao",
  "Lv35 Promessa Cumprida",
  "Lv36 Maratona Afinada",
  "Lv37 Parceiros de Endgame",
  "Lv38 Sincronia Rara",
  "Lv39 Fila Imparavel",
  "Lv40 Guardioes do Checkpoint",
  "Lv41 Rumo ao Final Verdadeiro",
  "Lv42 Dupla Sem Tilt",
  "Lv43 Lado a Lado",
  "Lv44 Campanha de Ouro",
  "Lv45 Ritual Completo",
  "Lv46 Mitos do Lobby",
  "Lv47 Conexao Perfeita",
  "Lv48 Alma Coop",
  "Lv49 Quase Lendas",
  "Lv50 Lendas do Coop"
] as const;

export const LEVEL_CURVE: readonly LevelDefinition[] = LEVEL_NAMES.map(
  (name, index) => ({
    level: index + 1,
    name,
    xpRequired: getLevelThreshold(index + 1)
  })
);

export function getLevelThreshold(level: number): number {
  if (!Number.isInteger(level) || level < 1 || level > LEVEL_COUNT) {
    throw new RangeError(`level must be an integer between 1 and ${LEVEL_COUNT}`);
  }

  if (level === 1) {
    return 0;
  }

  let threshold = 0;

  for (let currentLevel = 2; currentLevel <= level; currentLevel += 1) {
    threshold += Math.round(
      BASE_LEVEL_STEP_XP * LEVEL_CURVE_MULTIPLIER ** (currentLevel - 2)
    );
  }

  return threshold;
}

export function getLevelForXp(totalXp: number): LevelDefinition {
  const normalizedXp = toNonNegativeInteger(totalXp);
  let current = LEVEL_CURVE[0]!;

  for (const level of LEVEL_CURVE) {
    if (normalizedXp >= level.xpRequired) {
      current = level;
    } else {
      break;
    }
  }

  return current;
}

export function getNextLevelProgress(totalXp: number): {
  currentLevel: LevelDefinition;
  nextLevel: LevelDefinition | null;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressRatio: number;
} {
  const normalizedXp = toNonNegativeInteger(totalXp);
  const currentLevel = getLevelForXp(normalizedXp);
  const nextLevel = LEVEL_CURVE[currentLevel.level] ?? null;

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      xpIntoLevel: Math.max(0, normalizedXp - currentLevel.xpRequired),
      xpForNextLevel: 0,
      progressRatio: 1
    };
  }

  const xpForNextLevel = nextLevel.xpRequired - currentLevel.xpRequired;
  const xpIntoLevel = Math.max(0, normalizedXp - currentLevel.xpRequired);

  return {
    currentLevel,
    nextLevel,
    xpIntoLevel,
    xpForNextLevel,
    progressRatio: Math.min(1, xpIntoLevel / xpForNextLevel)
  };
}

function toNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}
