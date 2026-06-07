---
status: complete
completed: 2026-06-07T15:56:11Z
commit: pending
---

# Summary

Fixed the `/app/desafios` Postgres deprecation warning by removing parallel queries against a single gamification transaction client.

Improved `/app/conquistas` with clearer summary cards, group progress, compact badge rails and distinct locked/unlocked states.

Improved streak behavior and presentation:

- A fact after missed duo-days now spends the required available Freezes and counts the returning confirmed day.
- If the missed gap exceeds available Freezes, the streak resets cleanly and records the reset event.
- The challenge streak panel now explains protection, maintenance rhythm and last confirmed fact.

## Verification

- `pnpm --filter @queue/web test -- gamification-challenges gamification-achievements gamification-streak gamification-domain gamification-jobs`
- `pnpm --filter @queue/web typecheck`
- `pnpm check:architecture`
- `pnpm lint`
- `pnpm --filter @queue/web test -- gamification-rewards gamification-application gamification-dashboard-ui gamification-security`
- `pnpm typecheck`
- `pnpm --filter @queue/web test`
