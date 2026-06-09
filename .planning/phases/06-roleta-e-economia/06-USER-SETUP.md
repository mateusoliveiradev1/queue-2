---
phase: 06-roleta-e-economia
artifact: user-setup
generated: 2026-06-09T17:33:04.147Z
result: BLOCKED - missing external evidence
---

# Phase 6 User Setup

Use this setup before treating Phase 6 database, browser or migration evidence as complete. Missing variables are blockers, not passing evidence. Secret values are never written to this artifact.

## Database And Migration Evidence

| Variable | Status | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | missing | Direct test/integration database connection for `drizzle:generate` and `drizzle:migrate`; the gate maps it to `DIRECT_DATABASE_URL` for Drizzle Kit. |
| `TEST_DATABASE_URL` | configured | Isolated Neon/Postgres branch for roulette migration, RLS, concurrency and performance-hot-path evidence. |

## Authenticated E2E Fixtures

| Variable | Status | Purpose |
| --- | --- | --- |
| `E2E_BASE_URL` | configured | Local or deployed app URL for browser checks. |
| `E2E_READY_USER_EMAIL` | configured | Ready duo member 1 credentials. |
| `E2E_READY_USER_PASSWORD` | configured | Ready duo member 1 credentials. |
| `E2E_READY_PARTNER_EMAIL` | configured | Ready duo member 2 credentials. |
| `E2E_READY_PARTNER_PASSWORD` | configured | Ready duo member 2 credentials. |
| `E2E_OTHER_DUO_USER_EMAIL` | configured | Different-duo actor for isolation checks. |
| `E2E_OTHER_DUO_USER_PASSWORD` | configured | Different-duo actor for isolation checks. |
| `E2E_PHASE6_ELIGIBLE_SLUGS` | missing | Comma-separated Wishlist/Pausado slugs eligible for the ready duo roulette. |

Fixture expectations:

- `E2E_READY_USER_*` and `E2E_READY_PARTNER_*` must belong to exactly the same ready duo.
- `E2E_OTHER_DUO_USER_*` must belong to a different duo and must not see the ready duo roulette state.
- `E2E_PHASE6_ELIGIBLE_SLUGS` must list comma-separated Wishlist/Pausado game slugs for the ready duo.
- The ready duo needs enough eligible games to satisfy ROUL-01 and at least one scenario with a pending result for lock/discard browser evidence.

## Final Coverage Matrix

### Requirements

| ID | Coverage | Evidence |
| --- | --- | --- |
| ROUL-01 | Eligible pool and blocked state | roulette-domain, roulette-ui, phase-6-e2e |
| ROUL-02 | Server-authoritative result before reveal | roulette-domain, roulette-application, DB integration |
| ROUL-03 | Opt-in audio and no autoplay | roulette-ui, accessibility |
| ROUL-04 | Reduced motion and replay without redraw | roulette-domain, roulette-ui, phase-6-e2e |
| ROUL-05 | Rarity seal and Legendary fallback | roulette-ui, phase-6-e2e |
| ROUL-06 | Base and boosted rarity weights | roulette-domain, economy simulation |
| ROUL-07 | Discard cooldown | roulette-domain, roulette-application, economy simulation |
| ROUL-08 | Boost balance, cap and weekend generation | roulette-domain, roulette-application, economy simulation |
| ROUL-09 | Lock result as Principal | roulette-application, roulette-ui, phase-6-e2e |
| ROUL-10 | Idempotency and one active round | roulette-application, DB integration |
| SAFE-06 | Server authorization, RLS and no client-owned facts | security review, DB integration, gate |

### Decisions

| ID | Coverage | Evidence |
| --- | --- | --- |
| D-01 | Curated backlog source | roulette-domain |
| D-02 | Wishlist and Pausado eligibility | roulette-domain |
| D-03 | 60 visual covers with one persisted result | roulette-domain, roulette-ui |
| D-04 | Minimum eligible pool of 3 | roulette-domain, roulette-application |
| D-05 | Base rarity weights | economy simulation |
| D-06 | Recent discard cooldown | economy simulation, roulette-domain |
| D-07 | Pending invitation after reveal | roulette-application |
| D-08 | Separate boost balance | roulette-domain, DB integration |
| D-09 | Boost mirrors collective XP | roulette-domain |
| D-10 | 100 boost improves rarity odds | economy simulation |
| D-11 | Visible pity progress | roulette-ui |
| D-12 | Pity guarantee at 10 | economy simulation |
| D-13 | Weekend generation multiplier 1.2 | economy simulation |
| D-14 | Boost balance cap 600 | economy simulation |
| D-15 | Refund before persistence only | roulette-domain, roulette-application |
| D-16 | One active or pending round | DB integration, roulette-application |
| D-17 | Editorial reveal cadence | roulette-ui |
| D-18 | Opt-in audio preference | roulette-ui, accessibility |
| D-19 | Reduced-motion staged reveal | roulette-ui, accessibility |
| D-20 | Legendary static and particle fallback | roulette-ui, phase-6-e2e |
| D-21 | Persisted shared result before animation | roulette-application |
| D-22 | Replay is not a redraw | phase-6-e2e |
| D-23 | Mobile full-bleed reel with fixed pointer | roulette-ui, accessibility, phase-6-e2e |
| D-24 | Authoritative resume after refresh | roulette-application, phase-6-e2e |
| D-25 | Commitment invitation copy | roulette-ui |
| D-26 | Lock as Principal with audit | roulette-application |
| D-27 | Replacement required with no auto-pause | roulette-application, roulette-ui |
| D-28 | Dashboard roleta-principal highlight | roulette-ui |
| D-29 | New round blocked until invitation resolution | roulette-application |
| D-30 | Discard keeps persisted boost spend | roulette-application |
| D-31 | Central facts for locked and discarded results | roulette-ui, DB integration |
| D-32 | Compact history with result outcome | roulette-ui, performance review |

## Verification Commands

```bash
pnpm phase:6:gate
node --experimental-strip-types scripts/performance-explain.ts --phase=6
pnpm --filter @queue/db test:integration -- roulette-migrations roulette-rls roulette-concurrency performance-hot-paths
pnpm --filter @queue/web test:e2e -- tests/phase-6-e2e.spec.ts tests/accessibility.spec.ts
```

## Missing Variables

### Database

- DATABASE_URL

### Browser

- E2E_PHASE6_ELIGIBLE_SLUGS

## Result: BLOCKED - missing external evidence
