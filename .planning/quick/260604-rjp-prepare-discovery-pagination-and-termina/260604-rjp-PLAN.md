---
quick_id: 260604-rjp
slug: prepare-discovery-pagination-and-termina
status: completed
created: 2026-06-04
---

# Quick Task 260604-rjp: Prepare Discovery Pagination And Terminal Filtering

## Goal

Make the scaled catalog behavior explicit:

- Finished or dropped games must stop competing in the default Discovery deck.
- Discovery and Catalog need page-ready reads so a larger catalog does not stay pinned to the first fixed batch.

## Tasks

1. [x] Add repository/use-case pagination inputs.
2. [x] Add Discovery deck page state and pagination links.
3. [x] Hide terminal library statuses from default Discovery cycles.
4. [x] Add Catalog page pagination controls.
5. [x] Cover behavior with focused tests and run verification.

## Verification

- Discovery application tests cover terminal library filtering and deck page offsets.
- Catalog use-case tests cover offset passthrough.
- `pnpm --filter @queue/web test -- discovery-application catalog-domain` - passed, 26 tests.
- `pnpm --filter @queue/web test -- discovery-ui catalog-library-ui` - passed, 15 tests.
- `pnpm --filter @queue/web typecheck` - passed.
- `pnpm lint` - passed.
- `pnpm --filter @queue/web build` - passed.
- `pnpm check:secrets` - passed.
