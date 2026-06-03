# Phase 02: User Setup Required

**Generated:** 2026-06-03
**Phase:** 02-catalogo-e-biblioteca
**Status:** Complete for local UAT

Complete these items for RAWG catalog synchronization to function. The code, schema and server-only adapter are in place; the actual API key must come from the RAWG account.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [x] | `RAWG_API_KEY` | RAWG account API key from https://rawg.io/apidocs | Local `.env.local` for UAT |

## Account Setup

- [x] **Confirm RAWG API access**
  - URL: https://rawg.io/apidocs
  - Skip if: A valid RAWG API key is already available for QUEUE/2.
  - UAT result: Key was added locally and RAWG-backed seed sync populated the catalog for Phase 2 review.

## Dashboard Configuration

Production server environment still needs the same secret before deploy. This is a deployment configuration task, not a blocker for local Phase 2 UAT.

## Verification

After completing setup, verify with:

```bash
pnpm --filter @queue/web typecheck
pnpm check:secrets
```

Expected results:
- TypeScript passes with `RAWG_API_KEY` read only in server-only catalog infrastructure.
- Secret scan passes without exposing actual secret values to source or client bundles.

---

**Phase 2 UAT result:** Complete for local UAT on 2026-06-03.
