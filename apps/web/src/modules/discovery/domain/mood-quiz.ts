export const MOOD_QUIZ_QUESTIONS = [
  {
    key: "energy",
    label: "Energia",
    prompt: "Qual energia voces tem para jogar agora?"
  },
  {
    key: "commitment",
    label: "Compromisso",
    prompt: "Qual tamanho de compromisso combina com a dupla?"
  },
  {
    key: "vibe",
    label: "Vibe",
    prompt: "Que clima voces querem para a proxima escolha?"
  }
] as const;

export const MOOD_ENERGY_ANSWERS = ["low", "medium", "high"] as const;
export const MOOD_COMMITMENT_ANSWERS = ["short", "steady", "epic"] as const;
export const MOOD_VIBE_ANSWERS = ["laugh", "think", "focus", "flexible"] as const;

export type MoodQuestionKey = (typeof MOOD_QUIZ_QUESTIONS)[number]["key"];
export type MoodEnergyAnswer = (typeof MOOD_ENERGY_ANSWERS)[number];
export type MoodCommitmentAnswer = (typeof MOOD_COMMITMENT_ANSWERS)[number];
export type MoodVibeAnswer = (typeof MOOD_VIBE_ANSWERS)[number];

export type MoodQuizAnswers = {
  energy: MoodEnergyAnswer;
  commitment: MoodCommitmentAnswer;
  vibe: MoodVibeAnswer;
};

export type MergedDuoMood = {
  energy: MoodEnergyAnswer;
  commitment: MoodCommitmentAnswer;
  vibe: MoodVibeAnswer;
  conflictResolution: "none" | "middle-ground" | "flexible";
};

export type DuoMoodMergeResult =
  | {
      kind: "empty";
      answeredMembers: 0;
      recommendationMode: "none";
    }
  | {
      kind: "preview";
      answeredMembers: 1;
      recommendationMode: "preview-only";
      mood: MergedDuoMood;
    }
  | {
      kind: "duo";
      answeredMembers: 2;
      recommendationMode: "full-duo";
      mood: MergedDuoMood;
    };

export function mergeDuoMoodAnswers(input: {
  first?: MoodQuizAnswers | null;
  second?: MoodQuizAnswers | null;
}): DuoMoodMergeResult {
  const answered = [input.first, input.second].filter(
    (answers): answers is MoodQuizAnswers => answers !== null && answers !== undefined
  );

  if (answered.length === 0) {
    return {
      kind: "empty",
      answeredMembers: 0,
      recommendationMode: "none"
    };
  }

  if (answered.length === 1) {
    const only = answered[0]!;

    return {
      kind: "preview",
      answeredMembers: 1,
      recommendationMode: "preview-only",
      mood: {
        ...only,
        conflictResolution: "none"
      }
    };
  }

  const first = answered[0]!;
  const second = answered[1]!;
  const energy = mergeOrderedAnswer(first.energy, second.energy, [
    "low",
    "medium",
    "high"
  ]);
  const commitment = mergeOrderedAnswer(first.commitment, second.commitment, [
    "short",
    "steady",
    "epic"
  ]);
  const vibe = mergeVibeAnswer(first.vibe, second.vibe);
  const conflictResolution = getConflictResolution({
    first,
    second,
    energy,
    commitment,
    vibe
  });

  return {
    kind: "duo",
    answeredMembers: 2,
    recommendationMode: "full-duo",
    mood: {
      energy,
      commitment,
      vibe,
      conflictResolution
    }
  };
}

export function moodToTags(mood: MergedDuoMood): string[] {
  return [
    `energy-${mood.energy}`,
    `commitment-${mood.commitment}`,
    `vibe-${mood.vibe}`
  ];
}

function mergeOrderedAnswer<T extends string>(left: T, right: T, order: T[]): T {
  if (left === right) {
    return left;
  }

  const leftIndex = order.indexOf(left);
  const rightIndex = order.indexOf(right);
  const middleIndex = Math.round((leftIndex + rightIndex) / 2);
  return order[middleIndex] ?? order[Math.floor(order.length / 2)]!;
}

function mergeVibeAnswer(left: MoodVibeAnswer, right: MoodVibeAnswer): MoodVibeAnswer {
  if (left === right) {
    return left;
  }

  return "flexible";
}

function getConflictResolution(input: {
  first: MoodQuizAnswers;
  second: MoodQuizAnswers;
  energy: MoodEnergyAnswer;
  commitment: MoodCommitmentAnswer;
  vibe: MoodVibeAnswer;
}): MergedDuoMood["conflictResolution"] {
  if (
    input.first.energy === input.second.energy &&
    input.first.commitment === input.second.commitment &&
    input.first.vibe === input.second.vibe
  ) {
    return "none";
  }

  if (
    input.energy === "medium" ||
    input.commitment === "steady" ||
    input.vibe === "flexible"
  ) {
    return input.vibe === "flexible" ? "flexible" : "middle-ground";
  }

  return "middle-ground";
}
