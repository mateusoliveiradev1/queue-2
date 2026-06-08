# Phase 6: Roleta E Economia - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-08T13:12:25.8193339-03:00
**Phase:** 6-roleta-e-economia
**Areas discussed:** Pool elegivel da roleta, Economia do boost e pity, Ritual da revelacao, Depois do resultado

---

## Pool elegivel da roleta

| Question | Options considered | User's choice |
|----------|--------------------|---------------|
| De onde a roleta deve puxar jogos por padrao? | Backlog curado; So matches; Inclui surpresa | Backlog curado |
| Quais estados entram na roleta? | Wishlist + Pausado; Wishlist somente; Wishlist + Pausado + matches nao salvos | Wishlist + Pausado |
| Como preencher 60 capas com menos de 60 elegiveis? | Repetir ponderado; Exigir 60 jogos; Completar com descoberta surpresa | Repetir ponderado |
| Minimo para permitir uma rodada? | 3 jogos; 5 jogos; Sem minimo | 3 jogos |
| Chance base antes de boost/pity/fim de semana? | Pesos por raridade; Chance igual por jogo; Peso por match score | Pesos por raridade |
| Jogo sorteado recentemente pode repetir? | Cooldown leve; Bloqueio temporario; Pode repetir normalmente | Cooldown leve |
| Papel de resultado nao travado? | Convite pendente; Mover para Pausado; Nada alem do historico | Convite pendente |
| Estado bloqueado da roleta? | Estado util com CTA; Estado seco; Modo demonstracao | Estado util com CTA |

**Notes:** The user asked for recommended options to be labeled explicitly going forward. Recommended options were shown on every later question.

---

## Economia do boost e pity

| Question | Options considered | User's choice |
|----------|--------------------|---------------|
| Boost deve reduzir XP total/nivel? | Saldo gastavel separado; Descontar do XP total; Boost gratuito limitado | Saldo gastavel separado |
| Como ganhar saldo gastavel? | Espelho parcial do XP ganho; So por quests/conquistas; Saldo mensal fixo | Espelho parcial do XP ganho |
| O que boost de 100 faz? | Melhorar pesos de raridade; Garantir Rare+; Avancar pity | Melhorar pesos de raridade |
| Como mostrar pity? | Progresso claro sem matematica pesada; Transparencia total; Pity invisivel | Progresso claro sem matematica pesada |
| Como pity garante Epic+? | Garantia qualificada na selecao; Esteira so Epic/Legendary; Converter resultado baixo | Garantia qualificada na selecao |
| Multiplicador de fim de semana? | Bonus no saldo de boost; Bonus no XP total; Bonus direto na raridade | Bonus no saldo de boost |
| Saldo deve ter cap? | Cap moderado; Sem cap; Cap alto so antiabuso | Cap moderado |
| Falha depois de gastar boost? | Refund se nao houve resultado; Gasto sempre consome; Perguntar ao usuario | Refund se nao houve resultado |
| Tentativas repetidas ou concorrentes? | Uma rodada ativa por dupla; Varias rodadas em fila; Ultima vence | Uma rodada ativa por dupla |

**Notes:** Economy must protect lifetime XP/level as memory of progress while still making boost feel like a real shared cost.

---

## Ritual da revelacao

| Question | Options considered | User's choice |
|----------|--------------------|---------------|
| Sensacao principal dos 5.5s? | Tensao editorial controlada; Arcade intenso; Calmo e quase utilitario | Tensao editorial controlada |
| Audio? | Opt-in por interacao e mudo facil; Som sempre ligado apos clique; Sem audio na v1 | Opt-in por interacao e mudo facil |
| Reduced motion? | Revelacao em etapas sem esteira longa; Pular direto; Mesma roleta mais lenta | Revelacao em etapas sem esteira longa |
| Legendary visual? | Particulas contidas + selo forte; Explosao; So borda | Particulas contidas + selo forte |
| Experiencia compartilhada? | Resultado compartilhado retomavel; Animacao sincronizada ao vivo; Animacao local | Resultado compartilhado retomavel |
| Replay? | Replay curto sem novo sorteio; Sem replay; Replay so do resultado final | Replay curto sem novo sorteio |
| Mobile? | Esteira full-bleed horizontal; Card compacto; Lista vertical animada | Esteira full-bleed horizontal |
| Aba/conexao interrompida? | Retomar do estado autoritativo; Reiniciar animacao; Erro e novo giro | Retomar do estado autoritativo |
| Copy do resultado? | Convite de compromisso; Vitoria/premiacao; Comando direto | Convite de compromisso |

**Notes:** The reveal should be memorable and brand-specific without becoming generic casino/arcade spectacle.

---

## Depois do resultado

| Question | Options considered | User's choice |
|----------|--------------------|---------------|
| Quem pode travar como Principal? | Qualquer membro com autoria; Confirmacao dos dois; Automatico apos reveal | Qualquer membro com autoria |
| Ja existem 3 Jogando? | Escolher substituicao; Bloquear travamento; Pausar secundario automaticamente | Escolher substituicao |
| Depois de travar? | Fecha rodada e registra handoff; Mantem convite aberto; Apaga convite | Fecha rodada e registra handoff |
| Quando nova rodada pode acontecer? | Resolver convite; Novo giro imediato; So depois de 24h | Resolver convite |
| Descartar resultado? | Sem punicao com historico; Remover por longo tempo; Devolver boost | Sem punicao com historico |
| Expiracao do convite? | Sem expiracao curta; Expira em 24h; Reset semanal | Sem expiracao curta |
| Aviso ao parceiro? | Notificacao operacional leve; Push sempre; Sem aviso | Notificacao operacional leve |
| Historico da roleta? | Historico compacto na tela; Historico detalhado completo; Sem historico | Historico compacto na tela |
| Para onde levar apos travar? | Jogando Agora com destaque; Detalhe do jogo; Ficar na roleta | Jogando Agora com destaque |

**Notes:** Result handoff should feel decisive but still respect agency and the existing Play replacement rules.

---

## the agent's Discretion

- Exact rarity weights, boost earning fraction, cap, cooldown duration, copy variants and UI composition remain for research/planning.
- Exact persistence shape, locks, idempotency keys and transaction boundaries remain for planning under the architecture/security contracts.

## Deferred Ideas

- Full Hall da Moral replay and memory shelves remain Phase 7.
- New surprise discovery modes remain Discovery scope.
- Store, cosmetics, inventory, individual currency and leaderboards remain out of scope.
