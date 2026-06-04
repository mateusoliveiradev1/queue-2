---
status: complete
quick_id: 260603-wof
slug: melhorar-seo-e-copy-das-telas-entregues-
date: 2026-06-04
---

# Quick Task 260603-wof Summary

## Completed

- Added SEO metadata helpers, canonical origin handling, richer root metadata, sitemap, robots and a generated Open Graph image.
- Marked operational auth/pairing routes and authenticated `/app` routes as `noindex`.
- Rewrote home, auth, pairing, dashboard, catalog, library and game-detail copy around the QUEUE/2 ritual instead of internal phase language.
- Removed user-visible `Fase 2`/`Fase 4` wording from library states and status messages.
- Updated UI tests and E2E expectations for the new headings and locked-state labels.

## Verification

- `pnpm --filter @queue/web typecheck`
- `pnpm --filter @queue/web check:architecture`
- `pnpm test tests/brand-ui.test.tsx tests/catalog-library-ui.test.tsx`
- `pnpm --filter @queue/web build`
- HTTP checks against `http://127.0.0.1:3001/`, `/robots.txt`, `/sitemap.xml` and `/opengraph-image`
