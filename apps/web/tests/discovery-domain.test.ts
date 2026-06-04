import { describe, expect, it } from "vitest";

import {
  canCreateDiscoveryMatch,
  evaluateDiscoveryDecision,
  getDiscoveryLibraryHandoffPolicy,
  NOT_NOW_COOLDOWN_DAYS,
  shouldExcludeFromCurrentDeck
} from "../src/modules/discovery/domain/discovery-policy";

describe("discovery decision policy", () => {
  it("creates a match only when both duo members want the same game", () => {
    expect(
      canCreateDiscoveryMatch({
        actorUserId: "member-1",
        partnerUserId: "member-2",
        actorDecision: "want",
        partnerDecision: "want"
      })
    ).toEqual({ ok: true });

    expect(
      canCreateDiscoveryMatch({
        actorUserId: "member-1",
        partnerUserId: "member-2",
        actorDecision: "want",
        partnerDecision: "skip"
      })
    ).toEqual({ ok: false, reason: "partner-has-not-wanted" });

    expect(
      canCreateDiscoveryMatch({
        actorUserId: "member-1",
        partnerUserId: "member-2",
        actorDecision: "not_now",
        partnerDecision: "want"
      })
    ).toEqual({ ok: false, reason: "actor-did-not-want" });
  });

  it("blocks duplicate matches and same-member approvals", () => {
    expect(
      canCreateDiscoveryMatch({
        actorUserId: "member-1",
        partnerUserId: "member-2",
        actorDecision: "want",
        partnerDecision: "want",
        existingMatch: true
      })
    ).toEqual({ ok: false, reason: "already-matched" });

    expect(
      canCreateDiscoveryMatch({
        actorUserId: "member-1",
        partnerUserId: "member-1",
        actorDecision: "want",
        partnerDecision: "want"
      })
    ).toEqual({ ok: false, reason: "same-member" });
  });

  it("returns cooldown and negative recommendation signal for Agora nao", () => {
    const decidedAt = new Date("2026-06-04T12:00:00.000Z");
    const effect = evaluateDiscoveryDecision({
      decision: "not_now",
      decidedAt
    });

    expect(effect).toMatchObject({
      decision: "not_now",
      preferenceWeight: -2,
      countsAsApproval: false,
      countsAsNegativeSignal: true,
      removesCurrentCard: true
    });
    expect(effect.cooldownUntil).toEqual(
      new Date("2026-06-18T12:00:00.000Z")
    );
    expect(NOT_NOW_COOLDOWN_DAYS).toBe(14);
  });

  it("keeps Pular free of preference weight and match impact", () => {
    const effect = evaluateDiscoveryDecision({ decision: "skip" });

    expect(effect).toMatchObject({
      decision: "skip",
      cooldownUntil: null,
      preferenceWeight: 0,
      countsAsApproval: false,
      countsAsNegativeSignal: false,
      removesCurrentCard: true
    });
  });

  it("excludes current cards according to durable decision and cooldown semantics", () => {
    const now = new Date("2026-06-04T12:00:00.000Z");

    expect(shouldExcludeFromCurrentDeck({ decision: null, now })).toBe(false);
    expect(shouldExcludeFromCurrentDeck({ decision: "want", now })).toBe(true);
    expect(shouldExcludeFromCurrentDeck({ decision: "skip", now })).toBe(true);
    expect(
      shouldExcludeFromCurrentDeck({
        decision: "not_now",
        cooldownUntil: new Date("2026-06-05T12:00:00.000Z"),
        now
      })
    ).toBe(true);
    expect(
      shouldExcludeFromCurrentDeck({
        decision: "not_now",
        cooldownUntil: new Date("2026-06-03T12:00:00.000Z"),
        now
      })
    ).toBe(false);
  });

  it("allows discovered games to move only to Phase 3 library handoff statuses", () => {
    expect(getDiscoveryLibraryHandoffPolicy("wishlist")).toEqual({
      ok: true,
      status: "wishlist"
    });
    expect(getDiscoveryLibraryHandoffPolicy("jogando")).toEqual({
      ok: true,
      status: "jogando"
    });
    expect(getDiscoveryLibraryHandoffPolicy("pausado")).toEqual({
      ok: true,
      status: "pausado"
    });
    expect(getDiscoveryLibraryHandoffPolicy("zerado")).toEqual({
      ok: false,
      reason: "future-confirmation-required"
    });
    expect(getDiscoveryLibraryHandoffPolicy("dropado")).toEqual({
      ok: false,
      reason: "future-confirmation-required"
    });
    expect(getDiscoveryLibraryHandoffPolicy("favorito")).toEqual({
      ok: false,
      reason: "invalid-status"
    });
  });
});
