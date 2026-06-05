---
quick_id: 260605-hrd
slug: home-redirect-auth-session
status: complete
completed: 2026-06-05T03:56:05.000Z
---

# Summary

## Changes

- Added `redirectAuthenticatedUserToApp()` to reuse the server-side Better Auth session check on public entry.
- Updated `/` to call that helper before rendering the public landing page.
- Preserved the email verification redirect for signed-in users that still need verification.
- Added brand/auth security coverage for the root authenticated redirect rule.

## Verification

- `pnpm --filter @queue/web test -- brand-ui auth-security`
- `pnpm verify`
