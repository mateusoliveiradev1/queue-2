export const DUO_MEMBER_LIMIT = 2 as const;

export type DuoLifecycleState = "sem-dupla" | "convite-ativo" | "pareado";

export interface DuoPublicSummary {
  readonly id: string;
  readonly name: string;
  readonly memberCount: typeof DUO_MEMBER_LIMIT;
  readonly pairedAt: Date;
}
