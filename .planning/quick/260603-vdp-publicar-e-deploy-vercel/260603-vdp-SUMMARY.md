---
status: completed
completed: 2026-06-03T22:31:30-03:00
quick_id: 260603-vdp
slug: publicar-e-deploy-vercel
---

# Quick Task 260603-vdp Summary

## Outcome

Published the public GitHub repository and deployed QUEUE/2 to Vercel production without committing local env files, Vercel metadata or secret values.

## Completed Work

- Added `origin` pointing to `https://github.com/mateusoliveiradev1/queue-2.git`, renamed the branch to `main`, and pushed the repository.
- Linked Vercel project `queue-2` with root directory `apps/web`, framework `nextjs`, Node.js 24.x and production branch `main`.
- Added app-level `apps/web/vercel.json` so Vercel Cron is available from the configured app root.
- Added `.vercel/` to `.gitignore` and verified `.env.local`, `apps/web/.env.local` and `.vercel/project.json` remain ignored.
- Configured encrypted Vercel production env vars for database runtime, Better Auth URLs/secrets, cron secret and RAWG key without printing values.
- Fixed the Turbo build env pass-through so Vercel builds can access required production env names.
- Applied SQL migrations to the clean production direct database and populated catalog data through RAWG sync plus curation seed.
- Switched Vercel `DATABASE_URL` to the production pooled Neon URL derived from the clean production direct database.
- Fixed catalog CLI/runtime refresh so TS source imports run under Node 24, It Takes Two uses the RAWG slug `it-takes-two`, and RAWG playtime persists during sync.

## Production State

- GitHub: https://github.com/mateusoliveiradev1/queue-2
- Vercel production: https://queue-2.vercel.app
- Production catalog database snapshot after setup:
  - 12 catalog games
  - 12 published PT-BR descriptions
  - 3 availability rows
  - 10 RAWG playtime rows
  - 0 test-like catalog rows

## Verification

- `pnpm check:secrets`
- `pnpm --filter @queue/db typecheck`
- `pnpm --filter @queue/web typecheck`
- `pnpm --filter @queue/web build`
- `pnpm test:integration`
- `pnpm catalog:seed-curation -- --dry-run`
- `pnpm lint`
- `pnpm check:architecture`
- Vercel deployment `dpl_FdM6kpduyeE4ZgySHehfBRMUcUaX` reached `Ready`.
- HTTP smoke checks:
  - `/` returned 200
  - `/login` returned 200
  - `/app/catalogo` returned 200
  - `/app/jogo/it-takes-two` returned 200
  - `/api/jobs/catalog/refresh` without secret returned 401

## Remaining Follow-Up

Production auth email delivery still needs `RESEND_API_KEY` and `EMAIL_FROM` configured in Vercel. They are not present locally and were not invented. Catalog, migrations, cron configuration, GitHub push and Vercel deployment are complete.
