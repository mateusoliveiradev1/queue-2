---
quick_id: 260610-hk1
status: complete
completed: 2026-06-10T12:49:34-03:00
commit: c8c2615
---

# Summary

Melhorei a landing page publica e a tela de cadastro sem alterar o contrato de autenticacao.

## Changes

- Landing com cena visual propria da fila/dupla, CTA primario para criar conta e provas curtas de produto no primeiro scroll.
- Cadastro com faixa de garantias do fluxo e texto mais claro sobre email, dupla 2/2 e senha.
- Checklist de senha progressivo: comeca pequeno, revela a proxima regra conforme a pessoa digita, mostra confirmacao apenas quando faz sentido e mantem feedback de sucesso.
- Testes de brand/auth atualizados para cobrir a landing e a progressao real do checklist.

## Verification

- `pnpm --filter @queue/web exec vitest run brand-ui auth-flow`
- Browser local em `http://localhost:3000/` e `http://localhost:3000/cadastro` com desktop e mobile sem overflow.
- `pnpm verify`
