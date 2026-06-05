---
quick_id: 260605-lsf
status: complete
completed: 2026-06-05T03:35:00.000Z
---

# Summary

Fixed the Biblioteca card action state after moving a game to Jogando/Pausado and corrected the Mais acoes action sheet layout.

## Changes

- Successful enhanced Biblioteca status moves now call `router.refresh()` so the visible queue receives the server-authoritative status.
- Primary status action forms remount/reset when the current game status changes, preventing stale `Confirmado` copy from sticking to the next card state.
- Library card action controls are capped to a compact desktop width instead of stretching across the whole card.
- Library action sheets now render above following cards instead of being clipped by card overflow.
- Mobile action sheets are height-capped and stay above the bottom navigation zone.

## Verification

- `pnpm --filter @queue/web test -- catalog-library-ui performance-mutation-ui`
- Browser fixture screenshot via Browser Use for Library action states.
- Headless Playwright measurements for desktop `1365x768` and mobile `390x844`.
- `pnpm verify`
