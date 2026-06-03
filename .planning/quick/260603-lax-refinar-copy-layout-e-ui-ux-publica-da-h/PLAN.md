---
quick_id: 260603-lax
slug: refinar-copy-layout-e-ui-ux-publica-da-h
status: complete
created: 2026-06-03T18:20:19.717Z
---

# Quick Task: Refinar copy, layout e UI/UX publica

## Context

The previous Phase 1.1 pass closed technically, but the public experience still reads too much like an internal phase artifact. The user explicitly asked to use the local Impeccable repo as a quality reference.

Impeccable sources used:

- `C:\Users\Liiiraa\Documents\estudos\teste\impeccable\skill\SKILL.md`
- `C:\Users\Liiiraa\Documents\estudos\teste\impeccable\skill\reference\brand.md`
- `C:\Users\Liiiraa\Documents\estudos\teste\impeccable\skill\reference\product.md`
- `C:\Users\Liiiraa\Documents\estudos\teste\impeccable\skill\reference\polish.md`
- `C:\Users\Liiiraa\Documents\estudos\teste\impeccable\STYLE.md`

The Impeccable context loader did not find root `PRODUCT.md`/`DESIGN.md` because QUEUE/2 stores project context in `.planning/PROJECT.md` and AGENTS instructions.

## Tasks

1. Rewrite public copy so it sounds like QUEUE/2, not phase/status language.
2. Strengthen the home as a brand surface while keeping it clearly interim before the final Phase 7 landing.
3. Tighten auth, signup, recovery, verification and pairing as product surfaces: clearer instructions, better action hierarchy, better mobile rhythm.
4. Run Impeccable detector, TypeScript, unit tests, build and public accessibility checks.
5. Commit the refinement as an atomic quick-task commit.

## Guardrails

- Do not change auth behavior, schema, RLS, server actions or route authorization.
- Do not promise Phase 2 catalog features as live.
- Keep Brazilian Portuguese copy direct and specific.
- Avoid generic SaaS copy, internal milestone language, em dashes, nested cards and decorative glow.
