import { describe, expect, it } from "vitest";

import { createPairingCodeUseCase } from "../src/modules/duo/application/create-pairing-code";
import type {
  DuoRepository,
  DuoUserContextRecord,
  PairingCodeRecord
} from "../src/modules/duo/application/ports";
import {
  canCreatePairingCode,
  canJoinPairingCode,
  classifyDuoRouteState,
  classifyMembershipState,
  isValidTimezone,
  validatePlainText
} from "../src/modules/duo/domain/duo-policy";
import {
  createPairingCodeFromRandomIndex,
  getPairingCodeState,
  isPairingCodeId,
  isPairingCodeFormat,
  normalizePairingCode
} from "../src/modules/duo/domain/pairing-code";

describe("pairing code domain", () => {
  it("normalizes and validates six friendly characters", () => {
    expect(normalizePairingCode(" q2-k7 m9 ")).toBe("Q2K7M9");
    expect(isPairingCodeFormat("Q2K7M9")).toBe(true);
    expect(isPairingCodeFormat("Q2I7O9")).toBe(false);
    expect(isPairingCodeFormat("Q2K7M")).toBe(false);
    expect(isPairingCodeId("00000000-0000-4000-8000-000000000001")).toBe(true);
    expect(isPairingCodeId("code-1")).toBe(false);
  });

  it("creates a deterministic code from an injected random index", () => {
    const indexes = [0, 1, 2, 3, 4, 5];
    const code = createPairingCodeFromRandomIndex(() => indexes.shift() ?? 0);

    expect(code).toBe("ABCDEF");
  });

  it("maps expired, revoked and claimed codes to the same inactive state", () => {
    const now = new Date("2026-06-03T12:00:00.000Z");

    expect(
      getPairingCodeState(
        {
          code: "Q2K7M9",
          expiresAt: new Date("2026-06-03T11:59:59.000Z"),
          revokedAt: null,
          claimedAt: null
        },
        now
      )
    ).toBe("inactive");
    expect(
      getPairingCodeState(
        {
          code: "Q2K7M9",
          expiresAt: new Date("2026-06-04T12:00:00.000Z"),
          revokedAt: now,
          claimedAt: null
        },
        now
      )
    ).toBe("inactive");
  });
});

describe("duo policy", () => {
  it("keeps pairing open only until the second member arrives", () => {
    expect(classifyMembershipState({ memberCount: 0, pairedAt: null })).toBe("none");
    expect(classifyMembershipState({ memberCount: 1, pairedAt: null })).toBe(
      "awaiting-partner"
    );
    expect(
      classifyMembershipState({
        memberCount: 2,
        pairedAt: new Date("2026-06-03T12:00:00.000Z")
      })
    ).toBe("paired");
    expect(canCreatePairingCode("paired")).toBe(false);
    expect(canJoinPairingCode("awaiting-partner")).toBe(false);
    expect(canJoinPairingCode("none")).toBe(true);
  });

  it("requires a shared name before the authenticated app is ready", () => {
    expect(classifyDuoRouteState({ membershipState: "none", duoName: null })).toBe(
      "pairing"
    );
    expect(classifyDuoRouteState({ membershipState: "paired", duoName: null })).toBe(
      "naming"
    );
    expect(
      classifyDuoRouteState({ membershipState: "paired", duoName: "Dupla do sofa" })
    ).toBe("ready");
  });

  it("accepts short plain text and rejects formatting markers", () => {
    expect(validatePlainText("  Dupla do sofa  ", "duo-name")).toEqual({
      ok: true,
      value: "Dupla do sofa"
    });
    expect(validatePlainText("<strong>Dupla</strong>", "duo-name")).toEqual({
      ok: false,
      reason: "formatted"
    });
    expect(validatePlainText("**Dupla**", "duo-name")).toEqual({
      ok: false,
      reason: "formatted"
    });
    expect(isValidTimezone("America/Sao_Paulo")).toBe(true);
    expect(isValidTimezone("Timezone inventado")).toBe(false);
  });
});

describe("create pairing code use case", () => {
  it("rejects a user whose duo is already formed", async () => {
    const repository = createRepository({
      profileDisplayName: "Jogador",
      membership: {
        duoId: "duo-1",
        memberSlot: 1,
        name: "Dupla",
        pairedAt: new Date("2026-06-03T12:00:00.000Z"),
        timezone: "America/Sao_Paulo",
        createdAt: new Date("2026-06-03T11:00:00.000Z"),
        notificationsEnabled: true,
        audioEnabled: true,
        members: [
          {
            userId: "user-1",
            displayName: "Jogador 1",
            memberSlot: 1,
            joinedAt: new Date("2026-06-03T11:00:00.000Z")
          },
          {
            userId: "user-2",
            displayName: "Jogador 2",
            memberSlot: 2,
            joinedAt: new Date("2026-06-03T12:00:00.000Z")
          }
        ]
      }
    });

    await expect(
      createPairingCodeUseCase(
        { userId: "user-1", displayName: "Jogador" },
        {
          repository,
          randomIndex: () => 0,
          now: () => new Date("2026-06-03T12:00:00.000Z")
        }
      )
    ).resolves.toEqual({ ok: false, state: "already-paired" });
  });
});

function createRepository(context: DuoUserContextRecord): DuoRepository {
  const code: PairingCodeRecord = {
    id: "00000000-0000-4000-8000-000000000001",
    duoId: context.membership?.duoId ?? "duo-new",
    code: "ABCDEF",
    expiresAt: new Date("2026-06-04T12:00:00.000Z"),
    revokedAt: null,
    claimedAt: null
  };

  return {
    ensureProfile: async () => undefined,
    getUserContext: async () => context,
    getActivePairingCode: async () => null,
    createDuoWithPairingCode: async () => code,
    createPairingCodeForExistingDuo: async () => code,
    revokePairingCode: async () => true,
    claimPairingCode: async () => ({ state: "claimed", duoId: code.duoId }),
    updateProfileDisplayName: async () => undefined,
    updateDuoSettings: async () => true
  };
}
