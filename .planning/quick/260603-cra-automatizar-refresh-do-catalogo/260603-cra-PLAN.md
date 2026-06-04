---
status: complete
created: 2026-06-03
quick_id: 260603-cra
slug: automatizar-refresh-do-catalogo
---

# Quick Task 260603-cra: Automatizar refresh do catalogo

## Goal

Garantir que o catalogo tenha um caminho automatico de atualizacao em producao, sem depender de execucao manual recorrente pelo usuario.

## Scope

1. Criar um servico de refresh do catalogo que rode sincronizacao RAWG, reaplique curadoria local e valide a saude dos dados publicados.
2. Expor uma rota de cron protegida por segredo para o Vercel executar automaticamente.
3. Adicionar configuracao `vercel.json`, comando manual de disparo para debug e documentacao de ambiente.
4. Cobrir a orquestracao com testes e rodar gates de qualidade.

## Non-Goals

- Implementar tradutor automatico ou IA de curadoria em runtime.
- Criar scraping de disponibilidade ou HLTB.
- Trocar o modelo de banco, auth ou fronteiras dos modulos.

## Verification

- `pnpm typecheck`
- `pnpm test`
- `pnpm check:architecture`
- `pnpm check:secrets`
- Verificacao local de health/rota quando as variaveis permitirem.
