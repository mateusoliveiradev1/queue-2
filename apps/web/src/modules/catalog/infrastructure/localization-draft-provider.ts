import "server-only";

export type LocalizationDraftProviderName = "deepl" | "openai" | "google" | "azure";

export type LocalizationDraftRequest = {
  rawText: string;
  sourceLocale: string;
  targetLocale: "pt-BR";
  gameName: string;
  rawSourceHash: string | null;
};

export type LocalizationDraft = {
  provider: LocalizationDraftProviderName;
  status: "draft";
  text: string;
  model: string | null;
  sourceLocale: string;
  targetLocale: "pt-BR";
  rawSourceHash: string | null;
  createdAt: Date;
};

export interface LocalizationDraftProvider {
  name: LocalizationDraftProviderName;
  createDraft(input: LocalizationDraftRequest): Promise<LocalizationDraft>;
}

/**
 * Provider decision for Phase 02.1:
 * - Published v1 copy is QUEUE/2 curated seed text.
 * - DeepL is the preferred future translation-draft provider.
 * - OpenAI may support optional review/rewriting assistance.
 * - Google/Azure remain viable alternatives behind this same draft-only port.
 *
 * Provider-assisted text is never a publish action. It can only create draft or
 * review input, and the publication path must pass the checklist helper in
 * localization-review-checklist.ts.
 */
export function createUnavailableLocalizationDraftProvider(): LocalizationDraftProvider {
  return {
    name: "deepl",
    async createDraft() {
      throw new Error(
        "Localization draft provider is not configured; QUEUE/2 curated seeds remain the published v1 source."
      );
    }
  };
}
