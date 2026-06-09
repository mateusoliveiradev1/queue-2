import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  createPairingCodeUseCase,
  revokePairingCodeUseCase
} from "../src/modules/duo/application/create-pairing-code";
import { joinDuoUseCase } from "../src/modules/duo/application/join-duo";
import type {
  DuoRepository,
  DuoUserContextRecord,
  PairingClaimOutcome,
  PairingCodeRecord,
  PairingRateLimitResult
} from "../src/modules/duo/application/ports";
import { updateDuoAudioPreferenceUseCase } from "../src/modules/duo/application/update-duo-audio-preference";
import { updateDuoSettingsUseCase } from "../src/modules/duo/application/update-duo-settings";

const repositorySource = readFileSync(
  "src/modules/duo/infrastructure/duo-repository.ts",
  "utf8"
);
const rateLimitSource = readFileSync("src/platform/rate-limit/persistent.ts", "utf8");
const pairingMigrationSource = [
  readFileSync("../../packages/db/src/migrations/0002_pairing_runtime.sql", "utf8"),
  readFileSync("../../packages/db/src/migrations/0003_review_hardening.sql", "utf8")
].join("\n");
const pairingPageSource = readFileSync("src/app/(public)/parear/page.tsx", "utf8");
const dashboardPageSource = readFileSync("src/app/app/page.tsx", "utf8");
const duoPageSource = readFileSync("src/app/app/dupla/page.tsx", "utf8");
const profilePageSource = readFileSync("src/app/app/perfil/page.tsx", "utf8");

describe("duo pairing flow", () => {
  it("creates and revokes a 24-hour pairing code for a user without a duo", async () => {
    const repository = new FakeDuoRepository();
    const result = await createPairingCodeUseCase(
      {
        userId: "user-1",
        displayName: "Jogador 1",
        timezone: "America/Sao_Paulo"
      },
      {
        repository,
        randomIndex: () => 0,
        now: () => new Date("2026-06-03T12:00:00.000Z")
      }
    );

    expect(result.ok).toBe(true);
    expect(result.ok && result.code.code).toBe("AAAAAA");
    expect(result.ok && result.code.expiresAt.toISOString()).toBe(
      "2026-06-04T12:00:00.000Z"
    );

    const revoked = await revokePairingCodeUseCase(
      {
        userId: "user-1",
        pairingCodeId: result.ok ? result.code.id : ""
      },
      repository
    );

    expect(revoked).toEqual({ ok: true, state: "code-revoked" });
    await expect(repository.getActivePairingCode("user-1")).resolves.toBeNull();
  });

  it("rejects invalid creation timezone and forged revoke ids before repository access", async () => {
    const repository = new FakeDuoRepository();

    await expect(
      createPairingCodeUseCase(
        {
          userId: "user-1",
          displayName: "Jogador 1",
          timezone: "Timezone inventado"
        },
        {
          repository,
          randomIndex: () => 0,
          now: () => new Date("2026-06-03T12:00:00.000Z")
        }
      )
    ).resolves.toEqual({ ok: false, state: "invalid-timezone" });
    await expect(
      revokePairingCodeUseCase(
        {
          userId: "user-1",
          pairingCodeId: "not-a-uuid"
        },
        repository
      )
    ).resolves.toEqual({ ok: false, state: "code-inactive" });

    expect(repository.ensureProfileCalls).toBe(0);
    expect(repository.revokeCalls).toBe(0);
  });

  it("maps invalid, inactive, already-paired and race-lost joins without leaking details", async () => {
    const repository = new FakeDuoRepository();
    const limiter = createLimiter();

    await expect(
      joinDuoUseCase(
        { userId: "joiner", displayName: "Joiner", code: "I0" },
        { repository, limiter }
      )
    ).resolves.toEqual({ ok: false, state: "invalid" });

    repository.claimOutcome = { state: "inactive" };
    await expect(
      joinDuoUseCase(
        { userId: "joiner", displayName: "Joiner", code: "Q2K7M9" },
        { repository, limiter }
      )
    ).resolves.toMatchObject({ ok: false, state: "inactive" });

    repository.claimOutcome = { state: "race-lost" };
    await expect(
      joinDuoUseCase(
        { userId: "joiner", displayName: "Joiner", code: "Q2K7M9" },
        { repository, limiter }
      )
    ).resolves.toMatchObject({ ok: false, state: "race-lost" });

    repository.contexts.set("paired-user", pairedContext("duo-paired", "paired-user"));
    await expect(
      joinDuoUseCase(
        { userId: "paired-user", displayName: "Pareado", code: "Q2K7M9" },
        { repository, limiter }
      )
    ).resolves.toEqual({ ok: false, state: "already-paired" });
  });

  it("returns a wait state when persistent pairing attempts are blocked", async () => {
    const repository = new FakeDuoRepository();
    const limiter = createLimiter({
      blocked: true,
      attemptsRemaining: 0,
      retryAfterSeconds: 180
    });

    await expect(
      joinDuoUseCase(
        { userId: "joiner", displayName: "Joiner", code: "Q2K7M9" },
        { repository, limiter }
      )
    ).resolves.toEqual({
      ok: false,
      state: "attempt-limited",
      attemptsRemaining: 0,
      retryAfterSeconds: 180
    });
  });

  it("rejects formatted duo names and accepts short plain text settings", async () => {
    const repository = new FakeDuoRepository();
    repository.contexts.set("user-1", pairedContext("duo-1", "user-1"));

    await expect(
      updateDuoSettingsUseCase(
        {
          userId: "user-1",
          name: "<strong>Dupla</strong>",
          timezone: "America/Sao_Paulo",
          notificationsEnabled: true,
          audioEnabled: true
        },
        repository
      )
    ).resolves.toEqual({ ok: false, state: "invalid-name" });

    await expect(
      updateDuoSettingsUseCase(
        {
          userId: "user-1",
          name: "Dupla do sofa",
          timezone: "America/Sao_Paulo",
          notificationsEnabled: false,
          audioEnabled: true
        },
        repository
      )
    ).resolves.toEqual({ ok: true, state: "duo-updated" });
  });

  it("persists the roulette audio preference through the current duo membership", async () => {
    const repository = new FakeDuoRepository();
    repository.contexts.set("user-1", pairedContext("duo-1", "user-1"));

    await expect(
      updateDuoAudioPreferenceUseCase(
        {
          audioEnabled: false,
          userId: "user-1"
        },
        repository
      )
    ).resolves.toEqual({ ok: true, state: "audio-preference-updated" });

    expect(repository.audioPreferenceUpdates).toEqual([
      {
        audioEnabled: false,
        duoId: "duo-1",
        userId: "user-1"
      }
    ]);
    expect(repository.contexts.get("user-1")?.membership?.audioEnabled).toBe(false);
  });

  it("does not update audio preference for users without a paired duo", async () => {
    const repository = new FakeDuoRepository();

    await expect(
      updateDuoAudioPreferenceUseCase(
        {
          audioEnabled: true,
          userId: "solo-user"
        },
        repository
      )
    ).resolves.toEqual({ ok: false, state: "not-paired" });

    expect(repository.audioPreferenceUpdates).toHaveLength(0);
  });
});

describe("duo persistence contract", () => {
  it("uses transaction-local identity and reviewed pairing functions", () => {
    expect(repositorySource).toContain("withAppUserTransaction");
    expect(repositorySource).toContain("app.claim_pairing_code");
    expect(repositorySource).toContain("app.revoke_pairing_code");
    expect(repositorySource).not.toContain("DIRECT_DATABASE_URL");
    expect(repositorySource).not.toContain("queue2_migrator");
    expect(repositorySource).not.toContain("BYPASSRLS");
  });

  it("stores pairing limits in the database rather than process memory", () => {
    expect(rateLimitSource).toContain("auth.rate_limit");
    expect(rateLimitSource).toContain('storage: "database"');
    expect(rateLimitSource).not.toMatch(/new Map|process memory/i);
  });

  it("keeps revocation and race-lost mapping behind safe security-definer functions", () => {
    expect(pairingMigrationSource).toContain("SECURITY DEFINER");
    expect(pairingMigrationSource).toContain("SET search_path = app, auth, ops, pg_catalog");
    expect(pairingMigrationSource).toContain("pairing_code_formed");
    expect(pairingMigrationSource).toContain("WHERE code.id = target_pairing_code_id");
    expect(pairingMigrationSource).toContain("revoke_pairing_code");
    expect(pairingMigrationSource).toContain("REVOKE ALL ON FUNCTION");
  });
});

describe("duo route-state wiring", () => {
  it("routes pairing actions through the duo public entrypoint", () => {
    expect(pairingPageSource).toContain('from "../../../modules/duo"');
    expect(pairingPageSource).toContain("createPairingCode");
    expect(pairingPageSource).toContain("joinDuo");
    expect(pairingPageSource).not.toContain("modules/duo/application");
    expect(pairingPageSource).not.toContain("modules/duo/infrastructure");
  });

  it("redirects verified users without a duo away from authenticated app routes", () => {
    expect(dashboardPageSource).toContain('redirect("/parear")');
    expect(duoPageSource).toContain('redirect("/parear")');
    expect(profilePageSource).toContain('redirect("/parear")');
    expect(dashboardPageSource).toContain("getDuoDashboard");
    expect(profilePageSource).toContain("getDuoDashboard");
  });

  it("does not request push permission in Phase 1 preferences", () => {
    expect(duoPageSource).not.toContain("Notification.requestPermission");
    expect(duoPageSource).not.toContain("PushManager");
    expect(duoPageSource).toContain("A permissao de push so aparece");
  });
});

function createLimiter(
  result: PairingRateLimitResult = {
    blocked: false,
    attemptsRemaining: 4,
    retryAfterSeconds: 300
  }
) {
  return {
    consume: async () => result
  };
}

function pairedContext(duoId: string, userId: string): DuoUserContextRecord {
  return {
    profileDisplayName: "Jogador",
    membership: {
      duoId,
      memberSlot: 1,
      name: "Dupla",
      pairedAt: new Date("2026-06-03T12:00:00.000Z"),
      timezone: "America/Sao_Paulo",
      createdAt: new Date("2026-06-03T11:00:00.000Z"),
      notificationsEnabled: true,
      audioEnabled: true,
      members: [
        {
          userId,
          displayName: "Jogador 1",
          memberSlot: 1,
          joinedAt: new Date("2026-06-03T11:00:00.000Z")
        },
        {
          userId: `${userId}-partner`,
          displayName: "Jogador 2",
          memberSlot: 2,
          joinedAt: new Date("2026-06-03T12:00:00.000Z")
        }
      ]
    }
  };
}

class FakeDuoRepository implements DuoRepository {
  readonly contexts = new Map<string, DuoUserContextRecord>();
  readonly codes = new Map<string, PairingCodeRecord>();
  readonly audioPreferenceUpdates: Array<{
    audioEnabled: boolean;
    duoId: string;
    userId: string;
  }> = [];
  claimOutcome: PairingClaimOutcome = { state: "inactive" };
  ensureProfileCalls = 0;
  revokeCalls = 0;

  async ensureProfile(userId: string, displayName: string) {
    this.ensureProfileCalls += 1;

    if (!this.contexts.has(userId)) {
      this.contexts.set(userId, { profileDisplayName: displayName, membership: null });
    }
  }

  async getUserContext(userId: string) {
    return this.contexts.get(userId) ?? { profileDisplayName: "", membership: null };
  }

  async getActivePairingCode(userId: string) {
    const duoId = this.contexts.get(userId)?.membership?.duoId;
    return (
      Array.from(this.codes.values()).find(
        (code) =>
          code.duoId === duoId &&
          !code.revokedAt &&
          !code.claimedAt &&
          code.expiresAt.getTime() > Date.now()
      ) ?? null
    );
  }

  async createDuoWithPairingCode(input: {
    userId: string;
    code: string;
    expiresAt: Date;
    timezone: string;
  }) {
    const code = this.makeCode("duo-new", input.code, input.expiresAt);
    this.contexts.set(input.userId, {
      profileDisplayName: input.userId,
      membership: {
        duoId: code.duoId,
        memberSlot: 1,
        name: null,
        pairedAt: null,
        timezone: input.timezone,
        createdAt: new Date("2026-06-03T12:00:00.000Z"),
        notificationsEnabled: true,
        audioEnabled: true,
        members: [
          {
            userId: input.userId,
            displayName: input.userId,
            memberSlot: 1,
            joinedAt: new Date("2026-06-03T12:00:00.000Z")
          }
        ]
      }
    });
    return code;
  }

  async createPairingCodeForExistingDuo(input: {
    userId: string;
    duoId: string;
    code: string;
    expiresAt: Date;
  }) {
    return this.makeCode(input.duoId, input.code, input.expiresAt);
  }

  async revokePairingCode(input: { userId: string; pairingCodeId: string }) {
    this.revokeCalls += 1;
    const code = Array.from(this.codes.values()).find(
      (candidate) => candidate.id === input.pairingCodeId
    );

    if (!code) {
      return false;
    }

    code.revokedAt = new Date("2026-06-03T13:00:00.000Z");
    return true;
  }

  async claimPairingCode() {
    return this.claimOutcome;
  }

  async updateProfileDisplayName() {
    return undefined;
  }

  async updateDuoSettings(input: {
    userId: string;
    duoId: string;
    name: string;
    timezone: string;
    notificationsEnabled: boolean;
    audioEnabled: boolean;
  }) {
    const context = this.contexts.get(input.userId);

    if (!context?.membership || context.membership.duoId !== input.duoId) {
      return false;
    }

    context.membership.name = input.name;
    context.membership.timezone = input.timezone;
    context.membership.notificationsEnabled = input.notificationsEnabled;
    context.membership.audioEnabled = input.audioEnabled;
    return true;
  }

  async updateDuoAudioPreference(input: {
    userId: string;
    duoId: string;
    audioEnabled: boolean;
  }) {
    const context = this.contexts.get(input.userId);

    if (!context?.membership || context.membership.duoId !== input.duoId) {
      return false;
    }

    context.membership.audioEnabled = input.audioEnabled;
    this.audioPreferenceUpdates.push(input);
    return true;
  }

  private makeCode(duoId: string, value: string, expiresAt: Date): PairingCodeRecord {
    const code = {
      id: `00000000-0000-4000-8000-${String(this.codes.size + 1).padStart(12, "0")}`,
      duoId,
      code: value,
      expiresAt,
      revokedAt: null,
      claimedAt: null
    };
    this.codes.set(value, code);
    return code;
  }
}
