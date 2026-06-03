export const queue2Brand = {
  name: "QUEUE/2",
  tagline: "A fila e nossa."
} as const;

export const queue2ColorTokens = {
  background: "oklch(0.16 0.025 285)",
  surface: "oklch(0.21 0.03 285)",
  ink: "oklch(0.96 0.015 95)",
  inkMuted: "oklch(0.72 0.02 95)",
  primary: "oklch(0.86 0.22 128)",
  accent: "oklch(0.62 0.27 305)",
  rarity: {
    common: "oklch(0.70 0.02 280)",
    rare: "oklch(0.78 0.16 220)",
    epic: "oklch(0.65 0.25 340)",
    legendary: "oklch(0.82 0.18 80)"
  }
} as const;

export * from "./brand/loading";
export * from "./brand/mark";
export * from "./brand/wordmark";
export * from "./feedback/toast";
export * from "./fonts";
