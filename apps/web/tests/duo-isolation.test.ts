import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type {
  DuoRepository,
  DuoUserContextRecord,
  PairingCodeRecord
} from "../src/modules/duo/application/ports";
import { updateDuoSettingsUseCase } from "../src/modules/duo/application/update-duo-settings";

const repositorySource = readFileSync(
  "src/modules/duo/infrastructure/duo-repository.ts",
  "utf8"
);
const databaseIsolationTestSource = readFileSync(
  "../../packages/db/tests/rls-isolation.test.ts",
  "utf8"
);

describe("application-layer duo isolation", () => {
  it("derives the target duo from the authorized user instead of client input", async () => {
    const repository = new IsolatedRepository();
    repository.addUser("user-a", "duo-a", "Dupla A");
    repository.addUser("user-b", "duo-b", "Dupla B");

    await expect(
      updateDuoSettingsUseCase(
        {
          userId: "user-a",
          name: "Dupla A atualizada",
          timezone: "America/Sao_Paulo",
          notificationsEnabled: false,
          audioEnabled: true
        },
        repository
      )
    ).resolves.toEqual({ ok: true, state: "duo-updated" });

    expect(repository.duoNames.get("duo-a")).toBe("Dupla A atualizada");
    expect(repository.duoNames.get("duo-b")).toBe("Dupla B");
  });

  it("denies settings updates when the current user has no paired duo", async () => {
    const repository = new IsolatedRepository();

    await expect(
      updateDuoSettingsUseCase(
        {
          userId: "user-sem-dupla",
          name: "Tentativa",
          timezone: "America/Sao_Paulo",
          notificationsEnabled: true,
          audioEnabled: true
        },
        repository
      )
    ).resolves.toEqual({ ok: false, state: "not-paired" });
  });

  it("keeps database-layer cross-duo denial coverage alongside app tests", () => {
    expect(databaseIsolationTestSource).toContain("cross-duo writes fail at the database layer");
    expect(databaseIsolationTestSource).toContain("row-level security");
    expect(repositorySource).toContain("withAppUserTransaction");
    expect(repositorySource).toContain("WHERE id = $1");
  });
});

class IsolatedRepository implements DuoRepository {
  readonly contexts = new Map<string, DuoUserContextRecord>();
  readonly duoNames = new Map<string, string>();

  addUser(userId: string, duoId: string, duoName: string) {
    this.duoNames.set(duoId, duoName);
    this.contexts.set(userId, pairedContext(userId, duoId, duoName));
  }

  async ensureProfile() {
    return undefined;
  }

  async getUserContext(userId: string) {
    return this.contexts.get(userId) ?? { profileDisplayName: "", membership: null };
  }

  async getActivePairingCode(): Promise<PairingCodeRecord | null> {
    return null;
  }

  async createDuoWithPairingCode(): Promise<PairingCodeRecord> {
    throw new Error("not needed");
  }

  async createPairingCodeForExistingDuo(): Promise<PairingCodeRecord> {
    throw new Error("not needed");
  }

  async revokePairingCode() {
    return false;
  }

  async claimPairingCode() {
    return { state: "inactive" } as const;
  }

  async updateProfileDisplayName(_input: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
  }) {
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
    const membership = this.contexts.get(input.userId)?.membership;

    if (!membership || membership.duoId !== input.duoId) {
      return false;
    }

    this.duoNames.set(input.duoId, input.name);
    return true;
  }

  async updateDuoAudioPreference(input: {
    userId: string;
    duoId: string;
    audioEnabled: boolean;
  }) {
    const membership = this.contexts.get(input.userId)?.membership;

    if (!membership || membership.duoId !== input.duoId) {
      return false;
    }

    membership.audioEnabled = input.audioEnabled;
    return true;
  }
}

function pairedContext(
  userId: string,
  duoId: string,
  duoName: string
): DuoUserContextRecord {
  return {
    profileDisplayName: userId,
    membership: {
      duoId,
      memberSlot: 1,
      name: duoName,
      pairedAt: new Date("2026-06-03T12:00:00.000Z"),
      timezone: "America/Sao_Paulo",
      createdAt: new Date("2026-06-03T11:00:00.000Z"),
      notificationsEnabled: true,
      audioEnabled: true,
      members: [
        {
          userId,
          displayName: userId,
          memberSlot: 1,
          joinedAt: new Date("2026-06-03T11:00:00.000Z")
        },
        {
          userId: `${userId}-partner`,
          displayName: `${userId}-partner`,
          memberSlot: 2,
          joinedAt: new Date("2026-06-03T12:00:00.000Z")
        }
      ]
    }
  };
}
