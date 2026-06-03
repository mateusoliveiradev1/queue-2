import {
  formatPlatformLabel,
  getCommonPlatforms,
  type PlatformKey
} from "./platforms";

export type MatchScoreLabel = "Forte" | "Boa" | "Incerta" | "Bloqueada";

export type MatchScoreInput = {
  mainFlowEligible: boolean;
  coopCampaignConfirmed: boolean;
  gamePlatforms: PlatformKey[];
  memberPlatforms: {
    first: PlatformKey[];
    second: PlatformKey[];
  };
  hasReliableTimeEstimate: boolean;
  hasVerifiedAvailability: boolean;
};

export type MatchScore = {
  label: MatchScoreLabel;
  recommendedForMainFlow: boolean;
  commonPlatforms: PlatformKey[];
  factors: string[];
};

export function calculateMatchScore(input: MatchScoreInput): MatchScore {
  const commonPlatforms = getCommonPlatforms(
    input.memberPlatforms.first,
    input.memberPlatforms.second
  ).filter((platform) => input.gamePlatforms.includes(platform));
  const factors: string[] = [];

  if (!input.coopCampaignConfirmed || !input.mainFlowEligible) {
    factors.push("coop campanha 2p nao confirmado");
    return {
      label: "Bloqueada",
      recommendedForMainFlow: false,
      commonPlatforms,
      factors
    };
  }

  factors.push("coop campanha 2p confirmado");

  if (commonPlatforms.length === 0) {
    factors.push("sem plataforma em comum");
    return {
      label: "Bloqueada",
      recommendedForMainFlow: false,
      commonPlatforms,
      factors
    };
  }

  factors.push(`plataforma em comum: ${commonPlatforms.map(formatPlatformLabel).join(", ")}`);

  if (input.hasReliableTimeEstimate) {
    factors.push("tempo estimado com fonte");
  } else {
    factors.push("tempo sem fonte confiavel");
  }

  if (input.hasVerifiedAvailability) {
    factors.push("disponibilidade verificada");
  } else {
    factors.push("disponibilidade nao verificada");
  }

  return {
    label: input.hasReliableTimeEstimate || input.hasVerifiedAvailability ? "Forte" : "Boa",
    recommendedForMainFlow: true,
    commonPlatforms,
    factors
  };
}
