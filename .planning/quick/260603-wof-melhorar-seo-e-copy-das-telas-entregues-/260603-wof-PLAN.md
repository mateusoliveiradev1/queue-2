# Quick Task 260603-wof: Melhorar SEO e copy das telas entregues nas fases 1 e 2

**Date:** 2026-06-04
**Status:** In progress

## Goal

Melhorar SEO e copy das telas ja entregues nas fases 1 e 2, usando a referencia editorial do repositorio local IMPECABLE para deixar a mensagem menos generica e mais propria do QUEUE/2.

## Scope

- Reforcar metadata global, canonical, Open Graph e Twitter metadata para a home publica.
- Adicionar `sitemap.xml` e `robots.txt` para apontar a pagina publica indexavel.
- Marcar telas operacionais e autenticadas como `noindex`.
- Melhorar copy de home, auth, pareamento, dashboard, catalogo, biblioteca e detalhe de jogo sem alterar regras de dominio.
- Remover linguagem interna de fase da UI final quando houver texto melhor para o usuario.

## Verification

- Rodar typecheck do app web.
- Rodar testes focados que cobrem copy/public surfaces e catalogo/biblioteca.
- Revisar diff para garantir que as mudancas ficaram em metadata, UI/copy e testes.
