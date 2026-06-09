---
phase: 06
plan: 10
artifact: security-review
generated: 2026-06-09T17:28:02.261Z
result: BLOCKED - missing external evidence
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

## External Evidence Blockers

- DATABASE_URL
- E2E_PHASE6_ELIGIBLE_SLUGS

## Findings

- critical: none
- high: none

## Result: BLOCKED - missing external evidence
