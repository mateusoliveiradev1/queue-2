---
status: completed
completed: 2026-06-03T22:52:35-03:00
quick_id: 260603-auth-login
slug: auth-login-verificacao-resend
---

# Quick Task 260603-auth-login Summary

## Outcome

Login now gives users an explicit path to resend verification, and the unverified-email error detector is more tolerant of Better Auth error shapes.

## Completed Work

- Added a "Reenviar verificacao" link to the login form.
- Updated invalid login copy to mention resend verification.
- Improved auth error serialization so `email_not_verified` can be detected from nested/non-enumerable error properties.
- Marked only `mateus100saopaulino@hotmail.com` as verified in production auth storage for immediate testing.
- Checked `mateus_sp4@outlook.com`; it was not present in the production auth database, so no update was applied.

## Verification

- `pnpm --filter @queue/web typecheck`
- `pnpm lint`
- `pnpm --filter @queue/web build`
- `pnpm check:secrets`

## Resend Constraint

The failed email was caused by Resend's testing-domain restriction for `onboarding@resend.dev`: it can only send to the Resend account owner's email address. Sending verification emails to arbitrary testers requires a verified custom domain and updating `EMAIL_FROM`.
