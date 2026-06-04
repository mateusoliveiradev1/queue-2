---
status: completed
completed: 2026-06-03
quick_id: 260603-email-template
slug: polir-template-email-auth
---

# Quick Task 260603-email-template: Summary

## Outcome

Os emails transacionais atuais de auth agora usam um template unico com visual QUEUE/2:

- marca no topo com icone `/2`, wordmark e tagline;
- card central responsivo para verificação de email e reset de senha;
- CTA destacado, faixa de etapas e nota de seguranca;
- fallback de link longo com quebra segura para Gmail/mobile;
- texto plain-text mantido para clientes sem HTML.

Durante os gates, a suite detectou uma regressao pequena no catalogo: RAWG sync apagava `catalog.game_time_estimates` quando nao recebia novo tempo estimado. O sync agora preserva tempo curado quando `timeEstimate` vem ausente.

## Verification

- `pnpm --filter @queue/web test` -- 107 passed
- `pnpm --filter @queue/web typecheck`
- `pnpm lint`
- `pnpm --filter @queue/web build`
- `pnpm check:secrets` -- 95 source files and 20 client bundle files checked
- Preview local via Playwright em desktop e mobile para o HTML de verificacao
