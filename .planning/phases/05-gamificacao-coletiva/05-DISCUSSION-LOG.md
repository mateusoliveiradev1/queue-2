# Phase 5: Gamificacao Coletiva - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md; this log preserves the alternatives considered.

**Date:** 2026-06-06T00:43:35.5731360-03:00
**Phase:** 5-Gamificacao Coletiva
**Areas discussed:** Cadencia de XP e niveis, Conquistas iniciais, Quests e rotacao, Streak sem culpa, Dashboard da gamificacao, Eventos que contam, Processamento das recompensas, Nomes dos 50 niveis, Anti-farm e justica, Recompensas de desafios

---

## Cadencia de XP e niveis

| Question | Options Presented | User's Choice |
|----------|-------------------|---------------|
| Como o XP deve sentir para a dupla? | Frequente e generoso; Moderado com marcos fortes; Raro e pesado; Voce decide | Moderado com marcos fortes |
| Como deve ser a curva dos 50 niveis? | Arranque rapido; Curva estavel v1.18; Longa e exigente; Voce decide | Curva estavel v1.18 com ajustes leves nos primeiros niveis se a simulacao mostrar friccao |
| O que deve acontecer no level-up? | Toast especial + detalhe no dashboard; Overlay comemorativo curto; Celebracao silenciosa; Voce decide | Toast especial + detalhe no dashboard, sem overlay obrigatorio |
| XP pode ser gasto em algo ja na Fase 5? | Nao, XP so acumula; Sim, freeze custa XP; Sim, cosmeticos simples; Voce decide | Nao, XP so acumula; gastos ficam reservados para boost da roleta na Fase 6 |

**Notes:** The user chose a moderate economy with meaningful moments and no Phase 5 spending surface.

---

## Conquistas iniciais

| Question | Options Presented | User's Choice |
|----------|-------------------|---------------|
| Qual deve ser o tom das conquistas? | Editorial e serio; Mistura ritual + piada interna; Comedia bem presente; Voce decide | Mistura de ritual e piada interna |
| Conquistas devem ser majoritariamente visiveis ou secretas? | Todas visiveis; Maioria visivel, algumas ocultas; Muitas secretas; Voce decide | Maioria visivel, algumas ocultas para surpresas raras ou engracadas |
| Como distribuir os grupos de conquistas? | Equilibrado entre todos; Mais peso em jogo real; Mais peso em descoberta/roleta; Voce decide | Mais peso em jogo real: Story, Coop-Sincronia, Compromisso e Streak; Roleta e Comedia como tempero |
| Como devem funcionar raridade e visual das conquistas? | Raridade so visual; Raridade visual + celebracao proporcional; Raridade afeta recompensa; Voce decide | Raridade visual + celebracao proporcional, sem competicao |

**Notes:** Achievement copy should carry product voice and avoid generic gamification.

---

## Quests e rotacao

| Question | Options Presented | User's Choice |
|----------|-------------------|---------------|
| Que papel as quests devem ter? | Guia de habito leve; Objetivos fortes da semana; Exploracao e variedade; Voce decide | Guia de habito leve |
| As tres quests semanais devem ser iguais para todas as duplas ou personalizadas? | Globais iguais; Personalizadas por estado da dupla; Totalmente adaptativas por comportamento; Voce decide | Personalizadas por estado da dupla, sem caixa-preta pesada |
| Como tratar quests sazonais na v1? | Poucas e explicitas; Sazonais completas; So preparar estrutura; Voce decide | Poucas e explicitas, com seeds ativaveis por calendario |
| Quando uma quest deve conceder XP? | Imediatamente ao completar; No reset/fechamento do ciclo; Misto; Voce decide | Misto: quest normal concede ao completar; mensal/sazonal pode ter marco final maior se fizer sentido |

**Notes:** Quests should guide behavior lightly, not become pressure.

---

## Streak sem culpa

| Question | Options Presented | User's Choice |
|----------|-------------------|---------------|
| O que deve contar para manter a streak da dupla? | Qualquer acao real confirmada; So sessao jogada; Sessao ou agendamento confirmado; Voce decide | Qualquer acao real confirmada: sessao confirmada, capitulo concluido, quest concluida ou presenca confirmada contam; navegacao nao conta |
| Como deve funcionar o backup ate 04:00? | Dia da dupla fecha as 04:00; Janela de perdao no dia seguinte; So copy visual; Voce decide | Dia da dupla fecha as 04:00 no timezone da dupla |
| Quando usar Streak Freeze? | Automatico ao perder um dia; Manual com confirmacao; So aviso, sem consumo v1; Voce decide | Automatico ao perder um dia, se houver freeze disponivel |
| Qual deve ser o tom visual da streak? | Chama energetica, mas calma; Alta pressao; Minimalista; Voce decide | Chama energetica, mas calma; estado freezing visivel, sem pressao agressiva ou copy culpabilizante |

**Notes:** Streak is designed to reinforce consistency without shame.

---

## Dashboard da gamificacao

| Question | Options Presented | User's Choice |
|----------|-------------------|---------------|
| Onde a gamificacao deve aparecer no dashboard? | Faixa logo abaixo do Principal; Painel lateral/denso; Bloco hero proprio acima do Principal; Voce decide | Faixa logo abaixo do Principal, sem tomar o hero |
| O que deve ficar visivel de primeira? | XP, nivel e streak; XP, nivel, streak, 3 quests e conquistas recentes; Tudo com detalhes completos; Voce decide | XP, nivel, streak, 3 quests e conquistas recentes |
| Paginas proprias de gamificacao devem ser quais? | /app/conquistas e /app/desafios; Uma unica /app/gamificacao; So dashboard na Fase 5; Voce decide | Criar/usar /app/conquistas e /app/desafios |
| Como deve ser o historico/auditoria de XP para o usuario? | Ledger discreto na UI; Historico completo e filtravel; Sem historico na UI v1; Voce decide | Ledger discreto na UI, explicando por que a dupla ganhou XP em linguagem simples |

**Notes:** Dashboard summary supports Principal/Jogando Agora rather than replacing it.

---

## Eventos que contam

| Question | Options Presented | User's Choice |
|----------|-------------------|---------------|
| Qual deve ser a fonte principal de eventos de gamificacao? | So fatos confirmados da dupla; Fatos confirmados + intencao forte; Quase toda interacao; Voce decide | So fatos confirmados da dupla |
| Match de descoberta deve contar para gamificacao na Fase 5? | Sim, como conquista/quest, nao XP recorrente; Sim, com XP pequeno por match; Nao na Fase 5; Voce decide | Sim, como conquista/quest, nao XP recorrente |
| Zerado deve ter recompensa especial ja na Fase 5? | Sim, grande marco coletivo; So conquista, sem XP extra; Deixar para Hall na Fase 7; Voce decide | Sim, grande marco coletivo com conquista, XP significativo e possivel progresso de quest |
| Eventos negativos, como Dropado, devem afetar gamificacao? | Sem punicao; so registro neutro; Punicao leve; Ignorar completamente; Voce decide | Sem punicao; so registro neutro. Dropado nao tira XP/streak e pode ter conquista rara/humorada se fizer sentido |

**Notes:** Confirmed facts are the boundary between real ritual and farmable interaction.

---

## Processamento das recompensas

| Question | Options Presented | User's Choice |
|----------|-------------------|---------------|
| Quando XP/nivel/conquista devem ser aplicados? | Na mesma transacao da acao confirmada; Sempre por job derivado; Hibrido com fila de eventos; Voce decide | Na mesma transacao da acao confirmada para XP, nivel e conquistas imediatas de sessao/capitulo/zerado |
| Como quests semanais/mensais devem ser rotacionadas? | Job cria/reset a janela; acoes completam progresso; Tudo por job; Derivado no read; Voce decide | Job cria/reseta janelas; acoes reais completam progresso e recompensa |
| Quando atualizar app.duos.xp, level e streak? | Como projecao transacional do ledger; So calcular por soma no read; Job de recomputacao periodico; Voce decide | Como projecao transacional do ledger/fatos; ledger e fonte auditavel e colunas do duo sao cache/projecao atual |
| Como tratar falhas parciais na recompensa? | A acao falha junto se recompensa critica falhar; A acao passa e recompensa fica pendente; Sempre registrar evento e reconciliar depois; Voce decide | A acao falha junto se recompensa critica falhar; nao confirmar sessao/zerado deixando XP/nivel/conquista quebrados |

**Notes:** Immediate rewards are part of the authoritative mutation for critical effects.

---

## Nomes dos 50 niveis

| Question | Options Presented | User's Choice |
|----------|-------------------|---------------|
| Qual direcao de tom deve guiar os nomes? | Progressao de intimidade coop; Patentes/ranques de jogo; Caos gamer/comedia; Voce decide | Progressao de intimidade coop: comeca casual e vai para parceria lendaria, com nomes que soam QUEUE/2 |
| Os 50 niveis devem ter nomes unicos ou faixas tematicas? | 50 nomes unicos; 10 faixas com 5 niveis cada; Nome so em marcos principais; Voce decide | 50 nomes unicos; precisam ser muito bem feitos e tratados como copy de produto, nao preenchimento |
| A lista deve ser mais universal ou mais brasileira? | PT-BR natural com referencias sutis; Universal/neutro; Bem brasileiro e cheio de giria; Voce decide | PT-BR natural com referencias sutis, sem depender de meme datado |
| Quer travar exemplos de extremos da progressao alem dos ja definidos? | So manter Lv1 e Lv50; Definir marcos Lv10/20/30/40 agora; Definir a lista completa agora; Voce decide | So manter Lv1 Casuais e Lv50 Lendas do Coop como ancoras; intermediarios ficam para planner/implementacao, mas devem ser muito bem perfeitos e passar por disciplina Impeccable de copy e revisao |

**Notes:** The user emphasized that the names must be extremely polished and that Impeccable should be used for copy and review.

---

## Anti-farm e justica

| Question | Options Presented | User's Choice |
|----------|-------------------|---------------|
| Qual deve ser a postura contra farm de XP? | Limites invisiveis e naturais; Limites explicitos na UI; Sem limites alem de idempotencia; Voce decide | Limites invisiveis e naturais: idempotencia, caps por fonte e elegibilidade por fato confirmado, sem mostrar anti-farm para o usuario |
| Sessoes muito curtas devem dar XP/progresso? | Progresso sim, XP so acima de minimo; Sempre dao XP; Nao contam para nada; Voce decide | Progresso sim; XP de sessao so acima de duracao minima |
| Capitulos manuais precisam de protecao contra spam? | Sim, caps e validacao leve; So XP unico por capitulo; Sem XP para capitulo; Voce decide | Sim, caps e validacao leve: titulo, limite razoavel por jogo/dia e XP unico por capitulo concluido |
| Como lidar com abuso detectado depois? | Recalcular e corrigir por ledger/projecao; Apagar premios problematicos; Nao corrigir v1; Voce decide | Recalcular e corrigir por ledger/projecao; manter fatos auditaveis, recomputar projecoes e registrar ajuste sem apagar historico |

**Notes:** Anti-farm should protect the economy without making the app feel punitive.

---

## Recompensas de desafios

| Question | Options Presented | User's Choice |
|----------|-------------------|---------------|
| O que quests/desafios devem entregar alem de XP? | XP + progresso visual; XP + badge/conquista unica quando fizer sentido; XP + titulos/cosmeticos equipaveis; Voce decide | XP + badge/conquista unica quando fizer sentido; desafios normais dao XP e desafios especiais podem desbloquear badge/conquista unica da dupla |
| Recompensas unicas devem ser de quais tipos? | Conquistas e badges permanentes; Titulos da dupla; Efeitos visuais temporarios; Mistura controlada | Conquistas e badges permanentes, sem inventario equipavel |
| Desafios sazonais devem deixar marca permanente? | Sim, selo permanente da temporada; So XP e celebracao momentanea; So se completar 100% da temporada; Voce decide | Sim, selo permanente datado da temporada na historia da dupla |
| Desafios incompletos devem deixar algum registro? | Nao, so completos entram na memoria; Sim, historico neutro de tentativa; So progresso atual ate reset; Voce decide | Nao, so completos entram na memoria; incompletos somem no reset e nao viram falha visivel |

**Notes:** Unique rewards are permanent achievements/badges, not a cosmetic inventory or store.

---

## the agent's Discretion

- Exact XP amounts, level threshold values, minimum session duration and anti-farm caps.
- Exact achievement seed list, quest seed list, seasonal activation dates and copy variants.
- Exact schema/table names, route composition and component decomposition.
- Exact visual composition for dashboard band, achievement grid, challenge page and rarity states.

## Deferred Ideas

- XP spending, roulette boost, pity and roulette economy belong to Phase 6.
- Hall, replay, reviews and broad historical presentation belong to Phase 7.
- Shop, inventory, equipable cosmetics and configurable titles are outside Phase 5.
