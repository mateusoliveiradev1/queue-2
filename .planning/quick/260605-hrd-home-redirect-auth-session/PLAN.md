---
quick_id: 260605-hrd
slug: home-redirect-auth-session
status: complete
created: 2026-06-05T03:54:35.000Z
completed: 2026-06-05T03:56:05.000Z
---

# Home Redirect Auth Session

## Goal

Make `/` behave persistently for signed-in users by redirecting an already verified session to `/app` instead of rendering the public landing page.

## Tasks

- [x] Add a server-side helper that redirects authenticated verified sessions to `/app`.
- [x] Call the helper from the root home page while preserving the landing page for anonymous users.
- [x] Keep unverified signed-in users on the email verification flow.
- [x] Add tests/source guards for the new home redirect rule.
- [x] Run focused tests and full verification before commit/push/deploy.
