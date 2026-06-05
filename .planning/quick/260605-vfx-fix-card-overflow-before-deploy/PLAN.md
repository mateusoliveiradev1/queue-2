---
quick_id: 260605-vfx
slug: fix-card-overflow-before-deploy
status: complete
created: 2026-06-05T03:05:47.000Z
---

# Fix Card Overflow Before Deploy

## Goal

Fix visual card overflow reported in Catalogo and Descobrir match history before pushing and deploying.

## Tasks

- Prevent idle action feedback boxes from rendering as stray `/2` rows inside compact cards.
- Clamp and wrap long catalog/library/match titles so generated IDs cannot overlap supporting text.
- Increase catalog card responsive minimum width and collapse narrow card containers before actions overflow.
- Add source guards for the CSS contracts and rerun focused UI tests plus verification.
