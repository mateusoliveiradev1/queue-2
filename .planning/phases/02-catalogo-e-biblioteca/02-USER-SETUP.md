# Phase 02: User Setup Required

**Generated:** 2026-06-03
**Phase:** 02-catalogo-e-biblioteca
**Status:** Incomplete

Complete these items for RAWG catalog synchronization to function. The code, schema and server-only adapter are in place; the actual API key must come from the RAWG account.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `RAWG_API_KEY` | RAWG account API key from https://rawg.io/apidocs | `.env.local` and server environment |

## Account Setup

- [ ] **Confirm RAWG API access**
  - URL: https://rawg.io/apidocs
  - Skip if: A valid RAWG API key is already available for QUEUE/2.

## Dashboard Configuration

None.

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

**Once all items complete:** Mark status as "Complete" at top of file.
