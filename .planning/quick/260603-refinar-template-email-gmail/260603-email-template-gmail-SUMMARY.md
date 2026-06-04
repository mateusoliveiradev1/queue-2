---
status: completed
completed: 2026-06-03
quick_id: 260603-email-template-gmail
slug: refinar-template-email-gmail
---

# Quick Task 260603-email-template-gmail: Summary

## Outcome

O template de auth foi refinado com base na captura real do Gmail:

- fundo externo voltou a ser branco para evitar a faixa bege gigante;
- marca `/2` e wordmark foram movidos para dentro do card;
- card ficou mais compacto e com largura maxima menor;
- nota de seguranca aparece mais cedo na dobra;
- HTML recebeu `translate="no"` e `notranslate` como sinal para reduzir traducao automatica do Gmail;
- previews locais desktop e mobile foram renderizados com Playwright.

## Verification

- `pnpm --filter @queue/web test` -- 107 passed
- `pnpm --filter @queue/web typecheck`
- `pnpm lint`
- `pnpm --filter @queue/web build`
- `pnpm check:secrets` -- 95 source files and 20 client bundle files checked
