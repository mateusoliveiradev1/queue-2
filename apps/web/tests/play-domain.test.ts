import { describe, expect, it } from "vitest";

import {
  CHAPTER_COMPLETION_XP,
  LIVE_SESSION_CONFIRMATION_XP,
  REMINDER_LEAD_MINUTES,
  SCHEDULED_SESSION_ATTENDANCE_XP,
  assignRoleForActivation,
  canRequestPushPermission,
  canSchedulePlayingGame,
  classifyTimelineMarkers,
  confirmDuoEffect,
  confirmTerminalRequest,
  createPendingConfirmationState,
  createTerminalRequest,
  evaluateLiveSessionStart,
  evaluateReminderPrecision,
  getChapterCompletionAward,
  getFourthGameDecision,
  getLiveSessionAward,
  getNotificationRealtimePolicy,
  getPushDisableEffect,
  getReminderDueAt,
  getReminderPreparedState,
  getScheduledSessionAward,
  getScheduledSessionMutationEffect,
  getServerElapsedSeconds,
  getSpoilerVisibility,
  isNotificationScopeAllowed,
  promoteSecondaryToPrincipal,
  validateActivePlayLayout,
  type ActivePlayGame
} from "../src/modules/play";

describe("play active queue policy", () => {
  it("makes the first Jogando game Principal and later games secondary", () => {
    expect(assignRoleForActivation([])).toEqual({
      ok: true,
      value: {
        role: "principal",
        position: 1
      }
    });

    expect(
      assignRoleForActivation([
        {
          id: "a",
          role: "principal",
          position: 1
        }
      ])
    ).toEqual({
      ok: true,
      value: {
        role: "secondary",
        position: 2
      }
    });
  });

  it("blocks a fourth active game without choosing a game to pause automatically", () => {
    const activeGames = activeLayout();

    expect(assignRoleForActivation(activeGames)).toEqual({
      ok: false,
      reason: "fourth-playing-game"
    });
    expect(getFourthGameDecision(activeGames)).toEqual({
      ok: true,
      value: {
        allowed: false,
        availableActions: ["pause", "replace", "cancel"],
        autoPause: false
      }
    });
  });

  it("promotes a secondary by demoting the old Principal and preserving one Principal", () => {
    const promoted = promoteSecondaryToPrincipal(activeLayout(), "secondary-b");

    expect(promoted).toEqual({
      ok: true,
      value: [
        {
          id: "secondary-b",
          role: "principal",
          position: 1
        },
        {
          id: "secondary-a",
          role: "secondary",
          position: 2
        },
        {
          id: "principal",
          role: "secondary",
          position: 3
        }
      ]
    });
    expect(
      promoted.ok
        ? promoted.value.filter((game) => game.role === "principal")
        : []
    ).toHaveLength(1);
  });

  it("rejects invalid role layouts before persistence work depends on them", () => {
    expect(
      validateActivePlayLayout([
        {
          id: "a",
          role: "principal",
          position: 1
        },
        {
          id: "b",
          role: "principal",
          position: 1
        }
      ])
    ).toEqual({ ok: false, reason: "multiple-principal-games" });

    expect(
      promoteSecondaryToPrincipal(activeLayout(), "principal")
    ).toEqual({ ok: false, reason: "not-secondary-game" });
  });
});

describe("play session and confirmation policy", () => {
  it("allows only one active live session and derives timers from server timestamps", () => {
    expect(evaluateLiveSessionStart({ activeLiveSessionId: null })).toEqual({
      ok: true,
      value: {
        action: "start"
      }
    });
    expect(evaluateLiveSessionStart({ activeLiveSessionId: "session-1" })).toEqual({
      ok: false,
      reason: "active-live-session-exists"
    });
    expect(
      getServerElapsedSeconds({
        serverStartedAt: new Date("2026-06-05T10:00:00.000Z"),
        serverNow: new Date("2026-06-05T10:12:30.000Z")
      })
    ).toBe(750);
  });

  it("keeps live and offline effects pending until both members confirm", () => {
    const initial = createPendingConfirmationState(["member-1", "member-2"]);
    const first = confirmDuoEffect({
      actorUserId: "member-1",
      state: initial
    });

    expect(first).toEqual({
      ok: true,
      value: {
        confirmedUserIds: ["member-1"],
        pendingUserIds: ["member-2"],
        doubleConfirmed: false
      }
    });

    if (!first.ok) {
      throw new Error("first confirmation should pass");
    }

    expect(
      getLiveSessionAward({
        sessionId: "live-1",
        doubleConfirmed: first.value.doubleConfirmed,
        awardAlreadyApplied: false
      })
    ).toEqual({
      ok: false,
      reason: "partner-confirmation-required"
    });

    const second = confirmDuoEffect({
      actorUserId: "member-2",
      state: {
        requiredUserIds: first.value.confirmedUserIds.concat(first.value.pendingUserIds),
        confirmedUserIds: first.value.confirmedUserIds
      }
    });

    expect(second).toMatchObject({
      ok: true,
      value: {
        doubleConfirmed: true
      }
    });
  });

  it("awards live session XP once after double confirmation", () => {
    expect(
      getLiveSessionAward({
        sessionId: "live-1",
        doubleConfirmed: true,
        awardAlreadyApplied: false
      })
    ).toEqual({
      ok: true,
      value: {
        amount: LIVE_SESSION_CONFIRMATION_XP,
        awardKey: "live-session:live-1"
      }
    });
    expect(
      getLiveSessionAward({
        sessionId: "live-1",
        doubleConfirmed: true,
        awardAlreadyApplied: true
      })
    ).toEqual({
      ok: false,
      reason: "award-already-applied"
    });
  });
});

describe("play progress, timeline and spoiler policy", () => {
  it("awards manual chapter XP once after the confirmed effect", () => {
    expect(
      getChapterCompletionAward({
        chapterId: "chapter-1",
        doubleConfirmed: true,
        awardAlreadyApplied: false
      })
    ).toEqual({
      ok: true,
      value: {
        amount: CHAPTER_COMPLETION_XP,
        awardKey: "chapter:chapter-1"
      }
    });
  });

  it("classifies automatic timeline markers without terminal completion side effects", () => {
    expect(
      classifyTimelineMarkers({
        confirmedSessionCountBefore: 0,
        sessionStartedAt: new Date("2026-06-05T23:30:00.000Z"),
        durationSeconds: 4 * 60 * 60,
        accumulatedConfirmedSecondsAfter: 6 * 60 * 60,
        estimatedMinutes: 360
      })
    ).toEqual([
      "first-session",
      "night-session",
      "marathon",
      "estimated-time-50",
      "estimated-time-100"
    ]);
  });

  it("keeps spoiler reveal state local to the viewer", () => {
    expect(
      getSpoilerVisibility({
        isSpoiler: true,
        viewerHasRevealed: false
      })
    ).toEqual({
      visible: false,
      requiresReveal: true
    });
    expect(
      getSpoilerVisibility({
        isSpoiler: true,
        viewerHasRevealed: true
      })
    ).toEqual({
      visible: true,
      requiresReveal: false
    });
    expect(
      getSpoilerVisibility({
        isSpoiler: false,
        viewerHasRevealed: false
      })
    ).toEqual({
      visible: true,
      requiresReveal: false
    });
  });
});

describe("terminal status policy", () => {
  it("creates only Zerado/Dropado requests and requires partner confirmation", () => {
    expect(
      createTerminalRequest({
        targetStatus: "zerado",
        requestedByUserId: "member-1"
      })
    ).toEqual({
      ok: true,
      value: {
        targetStatus: "zerado",
        requestedByUserId: "member-1",
        status: "pending"
      }
    });
    expect(
      createTerminalRequest({
        targetStatus: "favorito",
        requestedByUserId: "member-1"
      })
    ).toEqual({
      ok: false,
      reason: "invalid-terminal-status"
    });
    expect(
      confirmTerminalRequest({
        requestStatus: "pending",
        requestedByUserId: "member-1",
        actorUserId: "member-1"
      })
    ).toEqual({
      ok: false,
      reason: "partner-confirmation-required"
    });
    expect(
      confirmTerminalRequest({
        requestStatus: "pending",
        requestedByUserId: "member-1",
        actorUserId: "member-2"
      })
    ).toEqual({
      ok: true,
      value: {
        status: "confirmed",
        confirmedByUserId: "member-2"
      }
    });
  });
});

describe("scheduling, reminders and push policy", () => {
  it("allows scheduling only for Jogando games and resets attendance on game/time changes", () => {
    expect(canSchedulePlayingGame({ libraryStatus: "jogando" })).toEqual({
      ok: true,
      value: {
        ok: true
      }
    });
    expect(canSchedulePlayingGame({ libraryStatus: "wishlist" })).toEqual({
      ok: false,
      reason: "scheduled-game-not-playing"
    });
    expect(
      getScheduledSessionMutationEffect({
        changedGame: true,
        changedStartTime: false
      })
    ).toEqual({
      resetAttendanceConfirmations: true
    });
  });

  it("persists a 30-minute reminder due time but refuses exact copy without precise runner support", () => {
    const scheduledStartAt = new Date("2026-06-05T20:00:00.000Z");

    expect(getReminderDueAt(scheduledStartAt)).toEqual(
      new Date("2026-06-05T19:30:00.000Z")
    );
    expect(REMINDER_LEAD_MINUTES).toBe(30);
    expect(
      evaluateReminderPrecision({
        scheduledStartAt,
        runnerCapability: "daily-only"
      })
    ).toEqual({
      ok: false,
      reason: "reminder-precision-unavailable"
    });
    expect(getReminderPreparedState({ scheduledStartAt })).toEqual({
      dueAt: new Date("2026-06-05T19:30:00.000Z"),
      canPromiseExactReminder: false,
      copyState: "prepared-not-guaranteed"
    });
  });

  it("awards scheduled-session XP once only after attendance confirmation rules pass", () => {
    expect(
      getScheduledSessionAward({
        scheduledSessionId: "schedule-1",
        doubleConfirmed: true,
        awardAlreadyApplied: false
      })
    ).toEqual({
      ok: true,
      value: {
        amount: SCHEDULED_SESSION_ATTENDANCE_XP,
        awardKey: "scheduled-session:schedule-1"
      }
    });
  });

  it("requests push permission only after an explanatory action and disabling push keeps schedules usable", () => {
    expect(canRequestPushPermission({ trigger: "app-load" })).toEqual({
      ok: false,
      reason: "push-permission-not-action-triggered"
    });
    expect(canRequestPushPermission({ trigger: "schedule-created" })).toEqual({
      ok: true,
      value: {
        requestPermission: true
      }
    });
    expect(getPushDisableEffect()).toEqual({
      pushEnabled: false,
      schedulesRemainActive: true,
      inAppNotificationsRemainActive: true
    });
  });
});

describe("Central da Dupla notification policy", () => {
  it("limits notification types to operational Phase 4 items", () => {
    expect(
      isNotificationScopeAllowed({
        notificationType: "terminal-request"
      })
    ).toEqual({
      ok: true,
      value: {
        notificationType: "terminal-request"
      }
    });
    expect(
      isNotificationScopeAllowed({
        notificationType: "chat"
      })
    ).toEqual({
      ok: false,
      reason: "notification-out-of-scope"
    });
  });

  it("uses polling, focus refresh and optional Web Push without requiring WebSocket/SSE", () => {
    expect(getNotificationRealtimePolicy()).toEqual({
      usesPolling: true,
      refreshOnFocus: true,
      usesWebPushWhenAllowed: true,
      requiresWebSocket: false
    });
  });
});

function activeLayout(): ActivePlayGame[] {
  return [
    {
      id: "principal",
      role: "principal",
      position: 1
    },
    {
      id: "secondary-a",
      role: "secondary",
      position: 2
    },
    {
      id: "secondary-b",
      role: "secondary",
      position: 3
    }
  ];
}
