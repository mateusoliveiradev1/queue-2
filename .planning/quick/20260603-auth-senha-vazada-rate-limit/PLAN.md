---
gsd_task_version: 1.0
status: complete
created_at: "2026-06-03"
completed_at: "2026-06-03"
slug: auth-senha-vazada-rate-limit
---

# Quick Task: auth-senha-vazada-rate-limit

## Goal

Endurecer o cadastro e a redefinicao de senha contra senhas comprometidas, mantendo rate limit auditavel e persistente.

## Plan

- Adicionar verificacao server-only de senha comprometida via Have I Been Pwned Pwned Passwords.
- Usar modelo k-anonymity: SHA-1 local, envio apenas dos 5 primeiros caracteres do hash e comparacao local do sufixo.
- Bloquear cadastro e reset quando a senha aparecer em vazamentos conhecidos.
- Tornar a auditoria do rate limit explicita sobre storage, escopo de chave, headers de IP e regras por endpoint.
- Validar com testes, typecheck, lint, build e fluxo real local.
