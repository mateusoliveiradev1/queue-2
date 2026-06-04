# Phase 03: User Setup Required

**Generated:** 2026-06-04
**Phase:** 03-descoberta-e-matches
**Plan:** 03-04
**Status:** Incomplete

Complete these items for Match Live push notifications and full Phase 3 browser verification. The agent added code, tests and `.env.example`; actual secret values and live fixture accounts require human-owned environment access.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `VAPID_PUBLIC_KEY` | Generated VAPID keypair public key | `.env.local`, Vercel project env |
| [ ] | `VAPID_PRIVATE_KEY` | Generated VAPID keypair private key | `.env.local`, Vercel project env |
| [ ] | `VAPID_SUBJECT` | Contact URI for Web Push, such as `mailto:admin@example.com` | `.env.local`, Vercel project env |
| [ ] | `TEST_DATABASE_URL` | Isolated Neon test branch direct connection for integration tests | `.env.local` |
| [ ] | `E2E_BASE_URL` | Local or preview URL running the app | `.env.local` |
| [ ] | `E2E_READY_USER_EMAIL` | Verified user in a duo with seeded Discovery data | `.env.local` |
| [ ] | `E2E_READY_USER_PASSWORD` | Password for `E2E_READY_USER_EMAIL` | `.env.local` |
| [ ] | `E2E_READY_PARTNER_EMAIL` | Verified partner user in the same duo | `.env.local` |
| [ ] | `E2E_READY_PARTNER_PASSWORD` | Password for `E2E_READY_PARTNER_EMAIL` | `.env.local` |
| [ ] | `E2E_OTHER_DUO_USER_EMAIL` | Verified user from a different duo for isolation checks | `.env.local` |
| [ ] | `E2E_OTHER_DUO_USER_PASSWORD` | Password for `E2E_OTHER_DUO_USER_EMAIL` | `.env.local` |
| [ ] | `E2E_PHASE3_DISCOVERY_QUERY` | Catalog search query with at least one discoverable coop result | `.env.local` |

## Local Key Generation

Run from the repository root when the `@queue/web` dependencies are installed:

```bash
pnpm --filter @queue/web exec node -e "import('web-push').then(({ default: webPush }) => console.log(webPush.generateVAPIDKeys()))"
```

Copy the printed `publicKey` to `VAPID_PUBLIC_KEY` and `privateKey` to `VAPID_PRIVATE_KEY`. Do not commit these values.

## Verification

After setup, verify with:

```bash
pnpm check:secrets
pnpm --filter @queue/web test -- discovery-push
pnpm --filter @queue/db test:integration -- discovery
pnpm --filter @queue/web test:e2e -- tests/phase-3-e2e.spec.ts
pnpm --filter @queue/web test:e2e -- tests/accessibility.spec.ts
```

Expected results:

- Secret scan passes and does not report `VAPID_PRIVATE_KEY` in client bundles.
- Discovery push tests pass.
- Discovery integration tests run instead of skipping on missing `TEST_DATABASE_URL`.
- Phase 3 and accessibility Playwright specs run instead of skipping on missing fixtures.

---

**Once all items complete:** Mark status as "Complete" at top of file.
