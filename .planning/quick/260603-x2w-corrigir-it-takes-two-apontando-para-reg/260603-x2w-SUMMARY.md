# Quick Task 260603-x2w Summary

## Outcome

It Takes Two foi corrigido em producao e o sync local foi blindado contra a regressao que apontava para o registro `It Takes Two (itch)`.

## Changes

- `catalogSyncAllowlist` agora busca `rawgRef: "it-takes-two-2"` para It Takes Two e preserva o slug interno `it-takes-two`.
- `runCatalogSync` aplica o slug curado da allowlist ao payload RAWG e valida `expectedName` antes de persistir.
- `catalogRepository.syncRawgGame` adota um slug curado existente quando o `rawg_id` muda, evitando conflito unico em bases que ainda tenham o registro antigo.
- Testes de catalog sync cobrem slug curado, mismatch de nome, entrada real de It Takes Two e adocao de `rawg_id`.

## Production Fix

A linha `catalog.games.slug = 'it-takes-two'` foi atualizada em transacao:

- `rawg_id`: `179581` -> `455597`
- `name`: `It Takes Two (itch)` -> `It Takes Two`
- `rawg_url` e `source_url`: `https://rawg.io/games/it-takes-two-2`
- `background_image_url`: `https://media.rawg.io/media/games/d47/d479582ed0a46496ad34f65c7099d7e5.jpg`
- plataformas: `pc`, `playstation`, `switch`, `xbox`
- generos: `action`, `adventure`, `platformer`
- tempo estimado RAWG: `600` minutos

O `id` do jogo foi preservado, mantendo uma localizacao publicada e uma disponibilidade existentes.

## Verification

- `pnpm test tests/catalog-sync.test.ts` passou com 14 testes.
- `pnpm --filter @queue/web typecheck` passou.
- `pnpm --filter @queue/web check:architecture` passou.
- `pnpm check:secrets` passou.
- Consulta de producao confirmou nome, imagem, RAWG URL, fonte, plataformas, generos, tempo, localizacao e disponibilidade.
