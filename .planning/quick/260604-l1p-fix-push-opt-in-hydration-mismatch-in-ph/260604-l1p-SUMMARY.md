---
quick_id: 260604-l1p
status: complete
completed: 2026-06-04T18:12:00Z
---

# Quick Task Summary: Fix Push Opt-In Hydration Mismatch

## Completed

- Moved push browser-support detection in `PushOptInButton` from render-time branching to a post-mount `useEffect`.
- Kept the first render disabled and deterministic across SSR and hydration.
- Added a regression assertion in `discovery-push.test.ts` for hydration-safe support detection.
- Code commit: `b994969`.

## Verification

- `pnpm --filter "@queue/web" test -- discovery-push` passed.
- `pnpm --filter "@queue/web" typecheck` passed.

## Changed Files

- `apps/web/src/modules/discovery/presentation/push-opt-in-button.tsx`
- `apps/web/tests/discovery-push.test.ts`
