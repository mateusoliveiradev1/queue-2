---
status: complete
completed_at: "2026-06-03"
---

# Summary

Cadastro agora exige confirmacao de senha em duas camadas: feedback progressivo no formulario e bloqueio autoritativo no Server Action com estado `senhas-diferentes`.

## Validation

- `pnpm --filter @queue/web test tests/auth-flow.test.ts tests/auth-security.test.ts tests/brand-ui.test.tsx`
- `pnpm --filter @queue/web typecheck`
- `pnpm lint`
- `pnpm --filter @queue/web build`
- Playwright headless em `http://localhost:3000/cadastro`: mismatch voltou para `estado=senhas-diferentes`; senha confirmada chegou em `/parear`.
