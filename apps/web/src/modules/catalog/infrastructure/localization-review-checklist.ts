import "server-only";

export type LocalizationReviewChecklist = {
  coop_facts_checked: boolean;
  spoilers_avoided: boolean;
  facts_not_invented: boolean;
  natural_pt_br: boolean;
  queue2_tone_controlled: boolean;
};

export const requiredLocalizationReviewChecks = [
  "coop_facts_checked",
  "spoilers_avoided",
  "facts_not_invented",
  "natural_pt_br",
  "queue2_tone_controlled"
] as const satisfies readonly (keyof LocalizationReviewChecklist)[];

export type LocalizationPublishability =
  | {
      publishable: true;
      missing: [];
    }
  | {
      publishable: false;
      missing: (keyof LocalizationReviewChecklist)[];
    };

export function evaluateLocalizationPublishability(
  checklist: Partial<LocalizationReviewChecklist>
): LocalizationPublishability {
  const missing = requiredLocalizationReviewChecks.filter((key) => checklist[key] !== true);

  if (missing.length === 0) {
    return {
      publishable: true,
      missing: []
    };
  }

  return {
    publishable: false,
    missing
  };
}

export function assertLocalizationPublishable(
  checklist: Partial<LocalizationReviewChecklist>
): asserts checklist is LocalizationReviewChecklist {
  const result = evaluateLocalizationPublishability(checklist);

  if (!result.publishable) {
    throw new Error(`localization_review_incomplete:${result.missing.join(",")}`);
  }
}
