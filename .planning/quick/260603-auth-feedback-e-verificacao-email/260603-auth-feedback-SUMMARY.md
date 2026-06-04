---
status: completed
completed: 2026-06-03T22:46:32-03:00
quick_id: 260603-auth-feedback
slug: auth-feedback-e-verificacao-email
---

# Quick Task 260603-auth-feedback Summary

## Outcome

Improved public auth form feedback and clarified the verification email recovery path for existing unverified test accounts.

## Completed Work

- Added a reusable `PendingSubmitButton` using `useFormStatus`.
- Updated login, signup, password recovery, verification resend, email correction and logout forms to show disabled pending state with action-specific labels.
- Added a small spinner that respects `prefers-reduced-motion`.
- Fixed the unverified email status copy so it tells the user to request a new link instead of implying the app already resent it.
- Kept the existing resend verification flow as the preferred recovery path for old unverified accounts.

## Verification

- `pnpm --filter @queue/web typecheck`
- `pnpm lint`
- `pnpm --filter @queue/web build`
- `pnpm check:secrets`
- Playwright smoke against `http://localhost:3000` for:
  - `/login`
  - `/cadastro`
  - `/recuperar-senha`
  - `/verificar-email?email=teste%40example.com&estado=verifique-email`

## Account Handling Decision

Do not clear production accounts by default. Existing unverified accounts should log in, land on `/verificar-email`, and use "Reenviar email". With the temporary Resend sender `onboarding@resend.dev`, delivery may be limited until a custom domain is verified; for urgent manual testing, mark only explicitly named test emails as verified instead of wiping auth tables.
