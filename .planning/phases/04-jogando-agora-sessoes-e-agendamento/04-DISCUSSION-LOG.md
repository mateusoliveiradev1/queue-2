# Phase 4: Jogando Agora, Sessoes E Agendamento - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-05T08:08:48.6745379-03:00
**Phase:** 4-Jogando Agora, Sessoes E Agendamento
**Areas discussed:** Jogando Agora, Sessoes, Progresso e Timeline, Encerramento e Agenda, Central de Notificacoes, Tela da Dupla

---

## Jogando Agora

| Decision Point | Options Considered | Selected |
|----------------|--------------------|----------|
| Principal selection | Manual explicito; Primeiro ativo; Voce decide | Primeiro ativo with later manual promotion |
| Dashboard representation | Hero do Principal; Lista igualitaria; Voce decide | Hero do Principal |
| Reorder behavior | Drag direto sempre ativo; Modo de reorganizacao; Voce decide | Modo de reorganizacao |
| Fourth active game | Bloquear e explicar; Escolher substituicao; Voce decide | Escolher substituicao without automatic pause |

**User's choice:** User asked for the recommended path and requested that decisions continue being shown.
**Notes:** Recommendation locked: first `Jogando` becomes Principal when none exists; secondary games can be promoted; dashboard hero belongs to Principal.

---

## Sessoes

| Decision Point | Options Considered | Selected |
|----------------|--------------------|----------|
| Active live session count | Uma live por dupla; Uma live por jogo; Voce decide | Uma live por dupla |
| Timer source | Timer local; Timestamp de servidor; Voce decide | Timestamp de servidor |
| Live session completion | Confirmacao de quem encerra; Confirmacao dos dois; Voce decide | Confirmacao dos dois |
| Offline session shortcut | Formulario completo; Presets rapidos; Voce decide | Presets rapidos |

**User's choice:** Recommended path accepted.
**Notes:** Live and offline session effects remain pending until both members confirm; XP is awarded once after confirmation.

---

## Progresso e Timeline

| Decision Point | Options Considered | Selected |
|----------------|--------------------|----------|
| Progress model | Percentual unico; Tres camadas independentes; Voce decide | Tres camadas independentes |
| Chapter ownership | Confirmacao dupla por capitulo; Qualquer membro com auditoria; Voce decide | Qualquer membro com auditoria |
| Milestones | Poucos marcadores; Marcadores ricos e auditaveis; Voce decide | Marcadores ricos e auditaveis |
| Spoilers | Notas sempre visiveis; Spoiler oculto por viewer; Voce decide | Spoiler oculto por viewer |

**User's choice:** Recommended path accepted.
**Notes:** Progress must not invent precision. Source/freshness remains mandatory for estimated time.

---

## Encerramento e Agenda

| Decision Point | Options Considered | Selected |
|----------------|--------------------|----------|
| Zerado/Dropado | Confirmacao simples; Confirmacao dupla; Voce decide | Confirmacao dupla |
| Scheduled session model | Agenda simples; Compromisso com confirmacoes; Voce decide | Compromisso com confirmacoes |
| Reminder reliability | Best effort silencioso; Promessa com gate operacional; Voce decide | Promessa com gate operacional |
| Push permission timing | Pedir cedo; Pedir no contexto; Voce decide | Pedir no contexto |

**User's choice:** Recommended path accepted.
**Notes:** Vercel Hobby Cron limits make exact 30-minute reminder timing an operational gate. UI must not promise reliability the environment cannot deliver.

---

## Central de Notificacoes

| Decision Point | Options Considered | Selected |
|----------------|--------------------|----------|
| In-app notifications | Sem central; Central de notificacoes da dupla; Feed social/chat | Central de notificacoes da dupla |
| Real-time strategy | Revalidacao curta + push; WebSocket obrigatorio; Voce decide | Revalidacao curta + push |
| Scope boundary | Somente pendencias da fase; Feed amplo; Voce decide | Somente pendencias da fase |

**User's choice:** User clarified that "tempo real" means notifications from the duo, not social/chat.
**Notes:** Central da Dupla should show synchronized in-app notifications, unread badge and pending actions. WebSocket/SSE can be evaluated later behind the same product contract if polling is insufficient.

---

## Tela da Dupla

| Decision Point | Options Considered | Selected |
|----------------|--------------------|----------|
| Large `/app/dupla` evolution | Incluir tudo na fase 4; Criar fase 4.1 dedicada; Deixar para fase 7 | Criar fase 4.1 dedicada |
| Phase 4 `/app/dupla` scope | Minimo operacional; Redesign completo; Voce decide | Minimo operacional |

**User's choice:** User accepted the recommendation that the major `/app/dupla` evolution should be Phase 4.1.
**Notes:** Phase 4 may only touch `/app/dupla` for timezone, notification preferences, permission status, opt-out and relevant pending items.

---

## the agent's Discretion

- Exact implementation strategy for polling/revalidation interval, UI placement of Central da Dupla, job runner design, schema names and milestone thresholds.
- Exact copy and responsive composition, as long as PT-BR product language, accessibility and QUEUE/2 visual identity are preserved.

## Deferred Ideas

- Phase 4.1: evolve `/app/dupla` into a strong duo identity/configuration surface.
- Chat, comments, mentions and social-feed behavior remain out of scope.
- Deep gamification remains Phase 5; roulette/economy remains Phase 6; Hall/reviews/stats remain Phase 7.
