---
status: complete
created: 2026-06-07T15:47:57Z
updated: 2026-06-07T15:56:11Z
command: gsd-quick
---

# Fix gamification warning, achievements and streak polish

## Goal

Resolve the `pg` deprecation warning shown on `/app/desafios`, improve the achievements presentation, and make the streak surface more precise and reassuring without changing the collective/no-competition economy contract.

## Scope

- Remove parallel queries executed against the same gamification transaction client.
- Improve `/app/conquistas` cards, group progress and locked/unlocked state hierarchy.
- Improve `/app/desafios` streak panel with clearer protection, cutoff and next-window copy.
- Add focused tests that guard the transaction and presentation regressions.

## Verification

- Run focused gamification tests for challenges, achievements, streak and jobs.
- Run architecture/lint/typecheck if the focused suite exposes shared contract risk.
