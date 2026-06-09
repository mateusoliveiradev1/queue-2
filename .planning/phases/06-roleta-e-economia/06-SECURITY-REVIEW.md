---
phase: 06
plan: 10
artifact: security-review
generated: 2026-06-09T22:04:04.413Z
result: PASSED
---

# Phase 6 Security Review

## Scope

- Roulette result selection, boost balance, pity, cooldown, compact history, lock/discard and Play handoff.
- Browser is untrusted: no client result, duo, pity, balance, boost, cooldown or history fact is authoritative.
- Known critical findings: none recorded.
- Known high findings: none recorded.

## RLS And Roles

- Runtime role must not have `BYPASSRLS`; roulette tables use forced RLS in migration tests.
- Runtime identity is transaction-local through `current_user_id`/`queue2.user_id` patterns.
- Policies rely on `has_duo_membership` for member-scoped roulette balances, rounds, entries, boost ledger, cooldowns and history.

## Integrity Controls

- The one active roulette invariant is enforced by `app_roulette_rounds_active_duo_uidx` for active/revealing/pending invitation states.
- The boost ledger is append-only from application flows and uses unique duo-scoped keys/source tuples for exactly-once spend/refund effects.
- Roulette history append-only facts are kept in `app.roulette_history_events` with unique event keys.
- Idempotency keys converge replayed or concurrent round starts instead of duplicating costs, pity updates or history.

## Server Action And Route Validation

- `/app/roleta` actions submit only proposal fields such as round id or replacement id.
- Application use cases re-read authoritative duo, result, boost, pity, cooldown and active Play state on the server.
- Lock/discard paths call Play through public contracts and never deep-import Play internals from routes.

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

## External Evidence Blockers

None.

## Findings

- critical: none
- high: none

## Result: PASSED
