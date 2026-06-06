import type { GamificationRarity } from "../domain/gamification-policy";

type BadgeMotif =
  | "story"
  | "sync"
  | "commitment"
  | "discovery"
  | "streak"
  | "roulette"
  | "comedy"
  | "mystery";

export function AchievementBadgeIcon({
  iconKey,
  label,
  locked,
  rarity
}: {
  iconKey: string;
  label: string;
  locked: boolean;
  rarity: GamificationRarity;
}) {
  const motif = getBadgeMotif(iconKey);

  return (
    <svg
      aria-label={label}
      className="achievement-badge-icon"
      data-locked={locked ? "true" : "false"}
      data-motif={motif}
      data-rarity={rarity}
      fill="none"
      role="img"
      viewBox="0 0 96 112"
    >
      <title>{label}</title>
      <path
        className="achievement-badge-icon__plate"
        d="M48 4 84 22v33c0 23-14 40-36 53C26 95 12 78 12 55V22L48 4Z"
      />
      <path
        className="achievement-badge-icon__inner"
        d="M48 14 74 27v27c0 17-9 30-26 41C31 84 22 71 22 54V27L48 14Z"
      />
      <path className="achievement-badge-icon__shine" d="M31 29h34M28 80h40" />
      {renderMotif(motif)}
    </svg>
  );
}

function renderMotif(motif: BadgeMotif) {
  switch (motif) {
    case "story":
      return (
        <>
          <path d="M32 38h14c5 0 8 3 8 8v27H40c-5 0-8-3-8-8V38Z" />
          <path d="M54 46c0-5 3-8 8-8h2v35H54V46Z" />
          <path d="M39 49h8M39 58h8" />
        </>
      );
    case "sync":
      return (
        <>
          <path d="M31 56 42 42l11 14-11 14-11-14Z" />
          <path d="M48 56 59 42l11 14-11 14-11-14Z" />
          <path d="M39 78c5 5 13 5 18 0" />
        </>
      );
    case "commitment":
      return (
        <>
          <path d="M30 39h36v33H30V39Z" />
          <path d="M30 50h36M39 34v10M57 34v10" />
          <path d="M39 60h8M52 60h8M39 68h8" />
        </>
      );
    case "discovery":
      return (
        <>
          <circle cx="48" cy="57" r="17" />
          <path d="M48 40v17l13 8M31 57h-5M70 57h-5M48 35v-5" />
          <path d="M36 75 28 84" />
        </>
      );
    case "streak":
      return (
        <>
          <path d="M49 31c9 9 14 18 14 28 0 14-8 23-16 23-10 0-17-8-17-20 0-9 5-17 13-25-1 9 1 14 6 18 3-7 3-14 0-24Z" />
          <path d="M48 65c4 4 5 8 3 13" />
        </>
      );
    case "roulette":
      return (
        <>
          <circle cx="48" cy="58" r="18" />
          <path d="M48 40v18l14-10M48 58l-11 13M31 58h34" />
          <path d="M48 23 56 36H40l8-13Z" />
        </>
      );
    case "comedy":
      return (
        <>
          <path d="M30 58c0-8 5-14 12-14h12c7 0 12 6 12 14v16H30V58Z" />
          <path d="M36 74v8M60 74v8M39 56h4M53 56h4M42 65c4 3 8 3 12 0" />
        </>
      );
    case "mystery":
      return (
        <>
          <path d="M39 46c2-6 7-9 13-8 7 1 11 6 10 12-1 5-4 8-9 11-4 2-5 5-5 10" />
          <path d="M48 80h.5" />
          <path d="M32 35 25 28M64 35l7-7" />
        </>
      );
  }
}

function getBadgeMotif(iconKey: string): BadgeMotif {
  if (iconKey === "badge-mystery") {
    return "mystery";
  }

  if (iconKey.includes("sync")) {
    return "sync";
  }

  if (iconKey.includes("commit") || iconKey.includes("quest") || iconKey.includes("season")) {
    return "commitment";
  }

  if (iconKey.includes("discovery")) {
    return "discovery";
  }

  if (iconKey.includes("streak")) {
    return "streak";
  }

  if (iconKey.includes("roulette")) {
    return "roulette";
  }

  if (iconKey.includes("comedy")) {
    return "comedy";
  }

  return "story";
}
