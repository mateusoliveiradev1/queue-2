---
status: completed
created: 2026-06-03
quick_id: 260603-vdp
slug: publicar-e-deploy-vercel
---

# Quick Task 260603-vdp: Publicar repo e deploy Vercel

## Goal

Publicar o repositório GitHub público e preparar/deployar na Vercel sem versionar segredos ou metadados locais sensíveis.

## Scope

1. Garantir que arquivos locais de deploy/env não entram no git.
2. Configurar remote GitHub e pushar `main`.
3. Configurar/deployar via Vercel CLI quando a autenticação permitir.
4. Registrar bloqueios se depender de login/token externo.

## Non-Goals

- Expor valores de `.env.local`.
- Commitar `.vercel/`.
- Alterar produto além de proteção de publicação.

## Verification

- `pnpm check:secrets`
- `git status --short`
- `git push -u origin main`
- Vercel CLI auth/deploy status
