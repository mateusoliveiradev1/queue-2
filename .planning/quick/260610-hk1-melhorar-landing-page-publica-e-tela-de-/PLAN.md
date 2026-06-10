---
quick_id: 260610-hk1
slug: melhorar-landing-page-publica-e-tela-de-
status: complete
created: 2026-06-10T15:38:26.163Z
---

# Quick Task: Melhorar landing e cadastro

## Objective

Melhorar a landing page publica e a tela de cadastro com foco em primeira impressao e orientacao progressiva de senha, mantendo a validacao autoritativa no servidor.

## Scope

- Reforcar a landing com mais sinal de produto no primeiro scroll.
- Tornar o cadastro mais guiado e menos seco.
- Fazer as regras de senha aparecerem/ganharem destaque conforme a pessoa digita.
- Preservar `signupAction`, politica de senha, verificacao de vazamento e fluxo de email.

## Verification

- Testes focados de auth/brand UI.
- Build/typecheck/lint conforme necessario.
- Verificacao visual local/browser se houver servidor disponivel.

## Result

- Landing publica recebeu cena visual de fila/dupla, CTA mais direto para cadastro e provas curtas do modelo 2/2.
- Cadastro recebeu faixa de garantias e checklist de senha progressivo, com validacao final preservada no servidor.
- A progressao da senha foi coberta em teste e verificada no navegador em desktop e mobile.
