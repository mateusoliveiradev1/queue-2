---
quick_id: 260605-1p7
slug: execute-p0-and-local-p1-performance-secu
status: complete
created: 2026-06-05T04:13:27.574Z
source_quick: 260605-1g4
---

# Execute Performance/Security Hardening

## Goal

Execute the local P0/P1 items from quick `260605-1g4` that can be changed safely in the repository without production secrets or dashboard access.

## Scope

- Document the missing Phase 03.3 performance fixture variables in `.env.example`.
- Split normal session reads from authoritative session checks.
- Keep mutations and security-sensitive flows on authoritative session checks.
- Restrict Better Auth trusted IP headers to the Vercel request header path.
- Add server timing to `/app` and `/app/jogo/[slug]`.
- Tighten Next Image remote configuration for RAWG cover art.
- Record remaining production evidence blockers.

## Out Of Scope For Local Execution

- Creating real ready-duo, partner and other-duo production/preview accounts.
- Confirming actual Vercel Function region, Neon compute region and scale-to-zero state.
- Enabling Vercel Speed Insights, Observability or Firewall rules in the Vercel dashboard.
- Marking Phase 03.3 complete.

## Verification Plan

- `pnpm --filter @queue/web typecheck`
- `pnpm --filter @queue/web test auth-security performance-metrics discovery-application discovery-push discovery-search discovery-ui catalog-library-ui performance-mutation-ui`
- `git diff --check`

