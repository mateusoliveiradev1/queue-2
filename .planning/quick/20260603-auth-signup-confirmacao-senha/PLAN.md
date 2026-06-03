---
gsd_task_version: 1.0
status: complete
created_at: "2026-06-03"
completed_at: "2026-06-03"
slug: auth-signup-confirmacao-senha
---

# Quick Task: auth-signup-confirmacao-senha

## Goal

Endurecer o cadastro para exigir confirmacao de senha no cliente e no servidor, sem prometer controles que ainda nao existem.

## Plan

- Adicionar campo `confirmPassword` ao formulario de cadastro com feedback acessivel.
- Validar igualdade das senhas no Server Action antes de chamar Better Auth.
- Alinhar a copy da politica de senha com a validacao real contra nome, email e fragmentos comuns.
- Cobrir o contrato com testes e validar o fluxo real no navegador local.
