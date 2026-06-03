---
quick_id: 260603-lrh
slug: refinar-copy-visual-e-ui-ux-das-telas-au
status: complete
created: 2026-06-03T18:40:10.038Z
---

# Quick Task: Refinar telas autenticadas da Fase 1

## Context

The public auth polish was improved with the local Impeccable repo. The authenticated Phase 1 screens still contain internal/product-build language such as "Fase 1", "bloqueados" and "catalogo falso". They should feel like a real product state after pairing.

Impeccable register:

- `/app`, `/app/dupla`, `/app/perfil` are product surfaces.
- Familiarity, task clarity and consistent components matter more than brand theatrics.
- Copy should name what the user can do now and avoid internal roadmap language.

## Tasks

1. Refine app shell navigation and sidebar copy.
2. Rewrite `/app` empty state and next-step copy without internal phase wording.
3. Rewrite `/app/dupla` labels and helper copy as duo settings, not implementation notes.
4. Rewrite `/app/perfil` labels and helper copy to separate individual identity from shared progress.
5. Add small CSS polish for authenticated surfaces: section headers, list rhythm, mobile nav/action behavior.
6. Run Impeccable detector, typecheck, unit tests and build.

## Guardrails

- Do not change auth behavior, server actions, database schema, RLS or redirects.
- Do not claim catalog/library/roulette functionality is live.
- Keep copy Brazilian Portuguese, direct and ASCII-compatible for current repo style.
- Do not introduce new dependencies or new design vocabulary outside existing QUEUE/2 tokens.
