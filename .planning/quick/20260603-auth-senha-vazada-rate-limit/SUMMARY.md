---
status: complete
completed_at: "2026-06-03"
---

# Summary

Cadastro e redefinicao de senha agora consultam senhas comprometidas por k-anonymity SHA-1 antes de criar/alterar credenciais. Em producao o controle fica ligado por padrao; em desenvolvimento fica opt-in para nao depender de rede externa no fluxo local.

## Validation

- `pnpm --filter @queue/web test tests/auth-flow.test.ts tests/auth-security.test.ts tests/brand-ui.test.tsx`
- `pnpm --filter @queue/web typecheck`
- `pnpm lint`
- `pnpm --filter @queue/web build`
- Playwright headless em `http://localhost:3000/cadastro`: cadastro valido manteve destino `/parear`.
