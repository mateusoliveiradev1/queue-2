# Pitfalls Research

**Domain:** Produto colaborativo de jogos com gamificacao, catalogo externo e dupla fixa
**Researched:** 2026-06-03
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Vazamento De Dados Entre Duplas

**What goes wrong:**
Uma query sem filtro ou uma policy incorreta permite que uma dupla leia ou altere dados de outra.

**Why it happens:**
Autorizacao fica espalhada pela UI e por handlers, enquanto tabelas novas deixam de receber RLS.

**How to avoid:**
Autorizar membership no servidor, aplicar RLS em toda tabela com `duo_id`, usar role de minimo privilegio e testar duas duplas adversariais.

**Warning signs:**
Handlers recebem `duoId` e consultam diretamente sem helper comum; migrations criam tabelas de dominio sem policies.

**Phase to address:**
Phase 1 - Fundacao, identidade, auth e dupla.

---

### Pitfall 2: Mais De Dois Membros Em Uma Dupla

**What goes wrong:**
Dois convites aceitos ao mesmo tempo criam um terceiro membro e quebram a promessa `/2`.

**Why it happens:**
Uma contagem antes do insert nao protege contra concorrencia e um CHECK nao pode contar outras linhas.

**How to avoid:**
Use codigo de convite com alta entropia, expiracao e revogacao; aceite em transacao com row lock ou advisory lock e constraints unicas.

**Warning signs:**
O limite existe apenas na UI ou em uma query `count(*)` fora de transacao.

**Phase to address:**
Phase 1 - Fundacao, identidade, auth e dupla.

---

### Pitfall 3: XP, Pity E Conquistas Duplicados

**What goes wrong:**
Requests repetidas, retry manual ou dois clientes concedem o mesmo premio mais de uma vez.

**Why it happens:**
O sistema atualiza totais diretamente e nao registra a causa unica de cada mudanca.

**How to avoid:**
Crie `duo_xp_ledger`, idempotency keys e eventos transacionais; derive nivel e efeitos no servidor.

**Warning signs:**
Codigo usa `xp = xp + amount` sem ledger ou uma animacao cliente dispara a recompensa.

**Phase to address:**
Phase 5 - Gamificacao coletiva.

---

### Pitfall 4: Roleta Manipulavel Ou Divergente

**What goes wrong:**
O cliente escolhe um resultado diferente do historico, repete boost ou ignora pity.

**Why it happens:**
A animacao e confundida com a selecao autoritativa.

**How to avoid:**
Selecione e persista resultado, custo, pity e historico em uma transacao antes de revelar a animacao.

**Warning signs:**
Randomizacao acontece no browser ou o resultado so e salvo depois de 5.5 segundos.

**Phase to address:**
Phase 6 - Roleta e economia.

---

### Pitfall 5: Dependencia Incorreta De Dados Externos

**What goes wrong:**
O app chama RAWG diretamente, viola atribuicao, promete HLTB sem fonte ou mostra Game Pass desatualizado como verdade.

**Why it happens:**
Metadados externos parecem simples, mas possuem termos, limites e lacunas.

**How to avoid:**
Manter secrets no servidor, exibir links de atribuicao RAWG, armazenar fonte/frescor e usar o termo neutro `tempo estimado`.

**Warning signs:**
`RAWG_API_KEY` aparece em bundle cliente; UI usa a marca HLTB sem contrato; disponibilidade nao tem `last_checked_at`.

**Phase to address:**
Phase 2 - Catalogo e biblioteca.

---

### Pitfall 6: Jobs Agendados Nao Confiaveis

**What goes wrong:**
Streaks, quests, sync e lembretes deixam de rodar depois de uma falha silenciosa.

**Why it happens:**
Vercel Cron nao faz retry e Hobby limita frequencia; um endpoint grande acumula falhas parciais.

**How to avoid:**
Use job table persistida, idempotencia, tentativas, locks, logs e cron apenas como runner protegido por `CRON_SECRET`.

**Warning signs:**
Nao existe `attempts`, `last_error` ou `due_at`; o sistema depende de cron a cada 30 minutos em plano Hobby.

**Phase to address:**
Phase 4 - Sessoes e agendamento.

---

### Pitfall 7: Visual Forte Vira UX Cansativa

**What goes wrong:**
Glow, grain, scanlines, motion e cards competem com as tarefas diarias e reduzem legibilidade.

**Why it happens:**
O espetaculo da roleta e aplicado em todas as telas.

**How to avoid:**
Mantenha utilidade calma, capas como principal fonte de cor e energia alta apenas em momentos especiais; audite reduced motion e contraste.

**Warning signs:**
Scanlines fora da roleta, glow sem significado, muitas superficies aninhadas ou mobile com densidade de desktop.

**Phase to address:**
Phase 1 para tokens e shell; todas as fases de UI devem preservar o contrato.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Atualizar XP total sem ledger | Menos tabelas | Auditoria e idempotencia impossiveis | Never |
| Guardar stats manualmente | Dashboard rapido | Totais divergem do historico | Apenas cache derivado e reconstruivel |
| RLS apenas no fim | Migrations iniciais simples | Alto risco de vazamento e retrabalho | Never |
| Um cron para tudo | Menos endpoints | Falhas parciais e retries dificeis | Apenas como runner de jobs |
| Hardcode de regras de raridade | Prototipo rapido | Balanceamento quebra historico | Somente com versao explicita da regra |
| WebSocket para todo estado | Sensacao de real-time | Operacao e debugging maiores | Apenas apos provar necessidade |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| RAWG | Expor key ou omitir backlink | Chamar no servidor e atribuir em paginas que usam dados/imagens. |
| Better Auth | Misturar tabelas de auth e dominio sem fronteira | Usar schema `auth`, trusted origins, secret forte e callbacks controlados. |
| Neon | Usar owner role em toda query | Usar role de aplicacao com privilegios minimos e RLS. |
| Vercel Cron | Esperar retry automatico ou horario local | Persistir jobs, tratar UTC e proteger com `CRON_SECRET`. |
| Web Push | Pedir permissao no primeiro acesso | Pedir depois de uma acao com valor claro, como agendar sessao. |
| Web Audio | Tocar antes de gesto do usuario | Iniciar audio apos interacao e oferecer mute. |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Carregar capas hi-res sem estrategia | LCP ruim e gasto de imagem | `next/image`, tamanhos corretos, blur e lazy loading | Ja em mobile |
| Consultar catalogo sem paginacao/index | Busca lenta e alto egress | Indices, paginacao e campos selecionados | Milhares de jogos |
| Recalcular todos os stats em cada dashboard | Queries crescentes | Read models ou agregados reconstruiveis | Historico longo |
| Polling agressivo para tudo | Funcoes e banco sobrecarregados | Polling apenas em estados live e backoff | Centenas de usuarios ativos |
| Sync RAWG completo diario | Limites e tempo de job | Sync incremental por `updated_at` e prioridade | Catalogo amplo |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Codigo de dupla previsivel e sem expiracao | Sequestro de convite | Token aleatorio, expiravel, revogavel e rate-limited. |
| Funcao `security definer` com `search_path` aberto | Escalada via objeto malicioso | Fixar `search_path`, schema-qualify e restringir EXECUTE. |
| Secret externo no cliente | Abuso de quota e vazamento | Variaveis server-only e adapters de integracao. |
| Push subscription sem ownership | Notificacao enviada ao usuario errado | Vincular subscription ao usuario autenticado e permitir revogacao. |
| Confirmacao dupla baseada em payload cliente | Falsificacao de parceiro | Derivar identidade da sessao e registrar cada confirmador. |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Gamificacao gera culpa | Streak vira pressao e abandono | Copy colaborativa, freeze, pausar e celebracao sem punicao pesada. |
| Spoiler visivel por padrao | Estraga experiencia do parceiro | Ocultar e exigir reveal explicito. |
| Push sem contexto | Usuario nega permissao permanentemente | Solicitar apenas depois de agendamento ou match live. |
| Roleta sem reduced motion | Desconforto e inacessibilidade | Versao curta/estatica que preserva resultado. |
| Hall 3D como unica navegacao | Teclado e mobile sofrem | Oferecer lista plana acessivel equivalente. |
| Dados externos parecem absolutos | Usuario perde confianca | Mostrar fonte e frescor quando a informacao puder mudar. |

## "Looks Done But Isn't" Checklist

- [ ] **Auth:** verificacao, reset, rate limit, trusted origins e gerenciamento de sessoes foram testados.
- [ ] **Pareamento:** duas aceitacoes concorrentes nao conseguem criar terceiro membro.
- [ ] **RLS:** uma segunda dupla adversarial nao consegue ler nem alterar dados alheios.
- [ ] **Sessoes:** refresh e requests repetidas nao duplicam duracao ou XP.
- [ ] **Roleta:** o historico ja contem o resultado antes da animacao e boost e debitado uma vez.
- [ ] **Jobs:** falha e retry preservam idempotencia e ficam observaveis.
- [ ] **RAWG:** atribuicao aparece onde dados ou imagens sao usados.
- [ ] **Acessibilidade:** reduced motion, teclado, foco, contraste, audio mute e touch targets foram verificados.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Vazamento entre duplas | HIGH | Bloquear acesso, corrigir policies, auditar logs e adicionar testes de isolamento. |
| XP duplicado | MEDIUM | Reconstruir total pelo ledger, corrigir idempotencia e recalcular niveis. |
| Stats divergentes | MEDIUM | Regerar read models a partir de sessoes e eventos autoritativos. |
| Job perdido | LOW | Reagendar na tabela de jobs e processar novamente com idempotencia. |
| Dado externo incorreto | LOW | Marcar stale, atualizar fonte/frescor e corrigir copy. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Vazamento entre duplas | Phase 1 | Testes SQL e E2E com duas duplas. |
| Terceiro membro | Phase 1 | Teste concorrente de aceite de convite. |
| Dados externos incorretos | Phase 2 | Atribuicao, source metadata e key server-only. |
| Jobs nao confiaveis | Phase 4 | Teste de falha, retry e idempotencia. |
| XP duplicado | Phase 5 | Ledger unico por causa e replay de requests. |
| Roleta manipulavel | Phase 6 | Resultado persistido antes da animacao. |
| Visual cansativo | Todas as fases UI | Auditoria Impeccable, axe e reduced motion. |

## Sources

- https://neon.com/docs/guides/row-level-security - RLS com Neon.
- https://www.postgresql.org/docs/current/ddl-rowsecurity.html - comportamento de RLS.
- https://www.postgresql.org/docs/current/sql-createfunction.html - seguranca de funcoes.
- https://www.postgresql.org/docs/current/explicit-locking.html - locks e concorrencia.
- https://vercel.com/docs/cron-jobs/manage-cron-jobs - ausencia de retry, UTC e seguranca.
- https://vercel.com/docs/limits/overview - limites de cron por plano.
- https://rawg.io/apidocs - atribuicao, limites e nao redistribuicao.
- https://developer.mozilla.org/en-US/docs/Web/API/Push_API - push web.

---
*Pitfalls research for: QUEUE/2*
*Researched: 2026-06-03*
