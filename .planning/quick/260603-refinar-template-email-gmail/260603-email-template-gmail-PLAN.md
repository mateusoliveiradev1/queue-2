---
status: completed
created: 2026-06-03
quick_id: 260603-email-template-gmail
slug: refinar-template-email-gmail
---

# Quick Task 260603-email-template-gmail: Refinar template no Gmail

## Goal

Lapidar o template de email auth depois da captura real no Gmail, reduzindo o fundo externo excessivo e deixando o card mais compacto.

## Scope

1. Trazer a marca para dentro do card principal.
2. Reduzir espacamento vertical antes da nota de seguranca.
3. Usar fundo externo neutro para o Gmail nao parecer uma faixa bege gigante.
4. Adicionar sinal `translate="no"`/`notranslate` para tentar evitar banner automatico de traducao.
5. Atualizar teste e preview local.

## Verification

- `pnpm --filter @queue/web test`
- `pnpm --filter @queue/web typecheck`
- `pnpm --filter @queue/web build`
- `pnpm check:secrets`
