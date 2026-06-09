# Roadmap: QUEUE/2

## Overview

QUEUE/2 sera construido em sete fases que seguem o ritual real da dupla: primeiro formar uma identidade segura, depois criar a fila, descobrir jogos, jogar e registrar, ganhar progresso coletivo, sortear o proximo jogo e finalmente revisitar a historia em uma experiencia pronta para lancamento. Cada fase entrega uma capacidade completa e preserva a regra estrutural de exatamente dois jogadores.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Fundacao Modular, Marca, Auth E Dupla** - Usuarios acessam uma experiencia QUEUE/2 segura sobre arquitetura e dados verificaveis.
- [x] **Phase 01.1: Polimento Auth e Landing Intermediaria (INSERTED)** - A experiencia publica inicial ganha acabamento visual e navegacao de marca sem antecipar a landing final.
- [x] **Phase 2: Catalogo E Biblioteca** - A dupla constroi e organiza uma fila real de jogos com dados confiaveis.
- [x] **Phase 02.1: Localizacao e Qualidade do Catalogo (INSERTED)** - O catalogo fica localizado em portugues brasileiro, sincronizavel e pronto para sustentar descoberta sem dados crus. (completed 2026-06-03)
- [x] **Phase 3: Descoberta E Matches** - A dupla encontra jogos por cinco modos de descoberta e transforma preferencias em matches. (completed 2026-06-04)
- [x] **Phase 03.1: Refinos Visuais e UX da Descoberta (INSERTED)** - A experiencia de Descoberta ganha polimento visual, revisao browser real e limpeza de divida arquitetural antes de Jogando. (completed 2026-06-04)
- [x] **Phase 03.2: Biblioteca Escalavel e Backlog Operacional (INSERTED)** - A Biblioteca vira uma superficie escalavel de backlog, filtros, status e arquivo da dupla antes de Jogando. (completed 2026-06-05)
- [x] **Phase 03.3: Performance de Producao e UX de Latencia (INSERTED)** - O app fica perceptivelmente rapido em producao antes de novas funcionalidades ampliarem o custo operacional. (completed 2026-06-05; production gate passed)
- [x] **Phase 4: Jogando Agora, Sessoes E Agendamento** - A dupla joga, registra progresso e coordena sessoes coop. (completed 2026-06-05; external DB/browser/reminder readiness blockers recorded)
- [x] **Phase 5: Gamificacao Coletiva** - Acoes reais da dupla alimentam XP, niveis, conquistas, quests e streaks. (completed 2026-06-07; `pnpm phase:5:gate` passed)
- [ ] **Phase 6: Roleta E Economia** - A dupla escolhe o proximo jogo por uma roleta autoritativa e memoravel.
- [ ] **Phase 7: Hall, Stats E Lancamento** - A dupla revisita sua historia e o produto recebe acabamento publico completo.

## Phase Details

### Phase 1: Fundacao Modular, Marca, Auth E Dupla
**Goal**: Usuarios podem acessar uma experiencia QUEUE/2 segura, customizada e limitada a uma dupla fixa, sobre fronteiras modulares e dados verificaveis.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, DUO-01, DUO-02, DUO-03, DUO-04, DUO-05, DUO-06, DUO-07, DUO-08, DUO-09, DUO-10, BRND-01, BRND-02, BRND-03, BRND-04, BRND-05, BRND-06, BRND-11, BRND-13, ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05, ARCH-06, ARCH-07, DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09, DATA-10, DATA-11, DATA-12, SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, SAFE-05, SAFE-07, SAFE-08, SAFE-09, META-02
**Success Criteria** (what must be TRUE):
  1. Usuario pode criar conta, verificar email, entrar, recuperar senha, gerenciar sessoes e formar uma dupla por codigo sem permitir um terceiro membro.
  2. Dominios possuem APIs publicas e dependency direction verificadas automaticamente, enquanto routes, UI e Client Components nao conseguem importar regras ou recursos server-only indevidos.
  3. Duas duplas distintas nao conseguem acessar dados uma da outra, e constraints, RLS forcado, roles separadas, transacoes e testes concorrentes preservam os invariantes centrais.
  4. Migrations de banco passam em base vazia e upgrade, queries criticas possuem indices revisados e existe uma estrategia de restore testavel antes do lancamento.
  5. Auth, rate limits, headers, validacao, logs e scans atendem ao contrato de seguranca, enquanto a experiencia base exibe a marca e feedback QUEUE/2 coerentes.
**Plans**: 01-01, 01-02, 01-03, 01-04, 01-05, 01-06
**UI hint**: yes

### Phase 01.1: Polimento Auth e Landing Intermediaria (INSERTED)

**Goal**: A home provisoria e as telas publicas de auth/pareamento ficam visualmente intencionais, navegaveis pela marca e prontas para sustentar a Fase 2 sem prometer a landing final.
**Depends on**: Phase 1
**Requirements**: BRND-01, BRND-02, BRND-03, BRND-04, BRND-05, BRND-06, BRND-11, BRND-13, META-02
**Success Criteria** (what must be TRUE):
  1. A home provisoria apresenta QUEUE/2 como primeiro sinal de viewport, com CTAs claros para entrar, criar conta e parear, e deixa evidente que a landing final continua reservada para a Fase 7.
  2. O logo/wordmark nas telas publicas retorna para `/` com nome acessivel, sem quebrar os fluxos de login, cadastro, verificacao, recuperacao ou pareamento.
  3. Login, cadastro, verificacao, recuperacao e pareamento compartilham composicao visual mais refinada, com painel esquerdo menos vazio, marca consistente e controles sem texto estourado em mobile.
  4. O polimento nao altera schema, RLS, regras de auth, rotas protegidas ou o contrato de seguranca fechado na Fase 1.
  5. Testes de marca, typecheck e acessibilidade publica cobrem a navegacao de marca e a home provisoria.
**Plans**: 01.1-01
**UI hint**: yes

### Phase 2: Catalogo E Biblioteca
**Goal**: A dupla pode construir, entender e organizar uma fila real de jogos usando catalogo com fonte visivel.
**Depends on**: Phase 01.1
**Requirements**: CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, CAT-06, CAT-07, LIB-01, LIB-02, LIB-03, LIB-04, LIB-05
**Success Criteria** (what must be TRUE):
  1. Usuario pode navegar pelo catalogo RAWG e abrir um detalhe de jogo com capa, descricao, generos, lancamento e plataformas.
  2. Paginas que usam dados ou imagens RAWG exibem atribuicao ativa, e estimativas ou disponibilidades mostram fonte e frescor quando existem.
  3. Cada membro pode registrar suas plataformas e a dupla consegue ver automaticamente as plataformas em comum.
  4. Usuario pode adicionar jogos a Wishlist e organizar a biblioteca por Wishlist, Jogando, Zerado, Dropado ou Pausado.
  5. A biblioteca mostra match score e abre um detalhe preparado para sessoes, checkpoints, progresso e milestones.
**Plans**: 02-01, 02-02, 02-03
**Plan Waves**:
  - **Wave 1**: `02-01` - Catalog source, RAWG adapter and `catalog` schema.
  - **Wave 2 *(blocked on Wave 1 completion)*:** `02-02` - Duo platforms, library state, RLS and match-score rules.
  - **Wave 3 *(blocked on Wave 2 completion)*:** `02-03` - Authenticated catalog, library and game-detail UI.
**UI hint**: yes

### Phase 02.1: Localizacao e Qualidade do Catalogo (INSERTED)

**Goal**: O catalogo deixa de depender de descricoes cruas em ingles e passa a ter uma estrategia confiavel, cacheada e atribuida para textos PT-BR, mantendo RAWG seguro no servidor.
**Depends on:** Phase 2
**Requirements**: CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, SAFE-05
**Success Criteria** (what must be TRUE):
  1. Existe uma decisao documentada para traducao/localizacao do catalogo, incluindo provedor, custo, fallback, risco de invencao e criterio de qualidade.
  2. Sincronizacao RAWG deixa de ser operacao manual ad hoc e passa a ter caminho versionado, seguro e repetivel para popular/atualizar jogos.
  3. Descricoes PT-BR sao servidas de cache persistido ou curadoria explicita, nunca traduzidas em runtime da pagina.
  4. A UI diferencia fonte de dados/imagens RAWG, fonte da traducao/localizacao, frescor e indisponibilidade sem esconder atribuicao.
  5. Testes cobrem sync, fallback de localizacao, ausencia de segredo no cliente e renderizacao do detalhe em portugues.
**Plans**: 02.1-01, 02.1-02, 02.1-03
**Plan Waves**:
  - **Wave 1**: `02.1-01` - Persistent PT-BR localization contract and published catalog reads.
  - **Wave 2 *(blocked on Wave 1 completion)*:** `02.1-02` - Auditable RAWG sync, curation-preserving upserts and draft provider boundary.
  - **Wave 3 *(blocked on Wave 2 completion)*:** `02.1-03` - Source/freshness UI, no-English fallback and localization quality tests.
**UI hint**: yes

### Phase 3: Descoberta E Matches
**Goal**: A dupla pode reduzir indecisao, descobrir coops compativeis e transformar preferencias individuais em uma fila compartilhada.
**Depends on**: Phase 02.1
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07, DISC-08, DISC-09, DISC-10, DISC-11, DISC-12
**Success Criteria** (what must be TRUE):
  1. Membros podem usar swipe duplo e match live para descobrir quando ambos aprovam o mesmo jogo.
  2. A dupla pode receber uma surpresa de jogos ainda nao vistos e responder um quiz de mood com tres perguntas.
  3. Usuario pode buscar com autocomplete e filtrar por tempo estimado, plataforma comum, coop type, mood, ano, genero, raridade e disponibilidade.
  4. Recomendacoes funcionam por similaridade de tags no cold start e passam a incorporar filtragem colaborativa quando houver dados suficientes.
  5. Um jogo descoberto pode entrar imediatamente na Wishlist ou em outro status valido da biblioteca.
**Plans**: 03-01, 03-02, 03-03, 03-04
**Plan Waves**:
  - **Wave 1**: `03-01` - Discovery persistence, RLS, decision/match/mood/recommendation rules.
  - **Wave 2 *(blocked on Wave 1 completion)*:** `03-02` - Discovery application services, server actions, live/session/search contracts and library handoff.
  - **Wave 3 *(blocked on Wave 2 completion)*:** `03-03` - Authenticated Discovery deck, filters, quiz, search, match celebration and history UI.
  - **Wave 4 *(blocked on Wave 3 completion)*:** `03-04` - Match Live push, E2E/accessibility/integration hardening and final verification.
**UI hint**: yes

### Phase 03.1: Refinos Visuais e UX da Descoberta (INSERTED)

**Goal:** A experiencia de Descoberta fica visualmente refinada, validada em browser real e sem divida arquitetural conhecida antes de a dupla avancar para Jogando.
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07, DISC-08, DISC-09, DISC-10, DISC-11, DISC-12, BRND-02, BRND-04, BRND-05, BRND-06, BRND-11, BRND-13, SAFE-05
**Depends on:** Phase 3
**Success Criteria** (what must be TRUE):
  1. `/app/descobrir` passa por revisao browser autenticada em desktop, mobile e reduced motion sem hydration errors, texto sobreposto, foco invisivel ou controles quebrados.
  2. Deck, filtros, Match Live, Surpresa, Quiz, busca, historico e handoff recebem acabamento visual consistente com QUEUE/2, sem parecer template SaaS ou arcade generico.
  3. Os fluxos autenticados de Phase 3 possuem fixtures/documentacao suficientes para E2E real ou registram claramente qualquer gate de ambiente restante.
  4. A divida `application -> presentation/view-models` de discovery e resolvida, e `check:architecture` passa a bloquear regressao equivalente.
  5. Setup local de Discovery deixa claro migrations, VAPID, `TEST_DATABASE_URL`, `E2E_BASE_URL` e contas fixture antes de seguir para Phase 4.
**Plans**: 03.1-01, 03.1-02, 03.1-03, 03.1-04
  - **Wave 1:** `03.1-01` - Resolve Discovery application-to-presentation architecture debt.
  - **Wave 2 *(blocked on Wave 1 completion)*:** `03.1-02` - Deck-first Discovery route and mobile-ready app shell.
  - **Wave 3 *(blocked on Wave 2 completion)*:** `03.1-03` - Interaction, motion, search, match celebration and handoff polish.
  - **Wave 4 *(blocked on Wave 3 completion)*:** `03.1-04` - Browser validation, fixture setup and evidence capture.
**UI hint**: yes

### Phase 03.2: Biblioteca Escalavel e Backlog Operacional (INSERTED)

**Goal:** A Biblioteca deixa de ser uma lista crescente e vira uma superficie operacional escalavel para backlog, filtros, status, arquivo e retomada do fluxo da dupla.
**Requirements**: LIB-02, LIB-03, LIB-04, DISC-12, BRND-08, BRND-09, BRND-10, DATA-11, SEC-02
**Depends on:** Phase 03.1
**Plans:** 4/4 plans complete

**Plan Waves**:
  - **Wave 1:** `03.2-01` - Scalable Biblioteca read contract, active/archive policy and bounded repository queries.
  - **Wave 2 *(blocked on Wave 1 completion)*:** `03.2-02` - Operational Biblioteca route with Proximos, Jogando, URL filters and pagination.
  - **Wave 3 *(blocked on Wave 2 completion)*:** `03.2-03` - Compact queue cards, filter bar and primary/secondary status actions.
  - **Wave 4 *(blocked on Wave 3 completion)*:** `03.2-04` - Browser, accessibility, RLS and regression evidence.
**UI hint**: yes

### Phase 03.3: Performance de Producao e UX de Latencia (INSERTED)

**Goal:** O app fica perceptivelmente rapido em producao, com Catalogo, Biblioteca, Descobrir e mutacoes principais respondendo com feedback imediato, queries medidas e budgets reais antes de novas features.
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04, PERF-05, BRND-08, BRND-09, BRND-10, DATA-11, SAFE-04
**Depends on:** Phase 03.2
**Success Criteria** (what must be TRUE):
  1. Rotas autenticadas criticas (`/app`, `/app/catalogo`, `/app/biblioteca`, `/app/descobrir`, `/app/jogo/[slug]`) possuem baseline de producao/preview com TTFB, tempo ate conteudo util, Hydration e interacao inicial registrados.
  2. Mutacoes principais (`Adicionar a Wishlist`, mover status da Biblioteca, decisoes de Descobrir, handoff de match e controles de Live/Quiz) oferecem feedback visual em ate 100ms e nao dependem de redirect/render pesado para parecer concluidas.
  3. Hot paths de banco possuem contagem de queries, `EXPLAIN`/plano revisado em Neon, indices ou shapes corrigidos, e nenhum N+1 obvio em listas de Catalogo, Biblioteca ou Descobrir.
  4. Server Actions e rotas registram duracao por etapa sem vazar dados sensiveis, permitindo diagnosticar lentidao de auth, banco, RAWG/cache, render e revalidacao.
  5. Gates de browser em desktop, mobile, rede lenta e reduced motion provam que loading states, skeletons, botoes pendentes, navegacao e refresh nao deixam o usuario preso sem resposta.
**Plans**: 03.3-01, 03.3-02, 03.3-03, 03.3-04 (4/4 complete; `pnpm phase:03.3:gate` PASSED on 2026-06-05)

**Plan Waves**:
  - **Wave 1:** `03.3-01` - Production performance baseline, instrumentation and latency budgets.
  - **Wave 2 *(blocked on Wave 1 completion)*:** `03.3-02` - Database/query/server-action hot path optimization.
  - **Wave 3 *(blocked on Wave 2 completion)*:** `03.3-03` - Optimistic UX, loading states and redirect-free mutation flows.
  - **Wave 4 *(blocked on Wave 3 completion)*:** `03.3-04` - Production-like browser performance gates, regression tests and deployment evidence.
**UI hint**: yes

### Phase 4: Jogando Agora, Sessoes E Agendamento
**Goal**: A dupla pode transformar uma escolha em jogo real, registrar progresso coop e coordenar a proxima sessao.
**Depends on**: Phase 03.3
**Requirements**: PLAY-01, PLAY-02, PLAY-03, PLAY-04, PLAY-06, PLAY-07, PLAY-08, PLAY-09, PLAY-10, PLAY-11, PLAY-12, PLAY-13, SESS-01, SESS-02, SESS-03, SESS-04, SESS-05, SESS-06, SESS-07, SESS-08, SESS-09, SESS-10, SESS-11, SESS-12, SESS-13, SESS-14, SAFE-01, SAFE-02, SAFE-04
**Success Criteria** (what must be TRUE):
  1. Dashboard mostra um Principal e ate dois jogos secundarios, e a dupla pode reordenar os tres sem quebrar os limites de Jogando.
  2. A dupla pode acompanhar tempo coop, capitulos, percentual subjetivo e milestones, enquanto Zerado e Dropado exigem confirmacao dos dois membros.
  3. A dupla pode iniciar uma sessao live com timer resiliente a refresh, confirmar em conjunto e registrar "Jogamos Hoje" rapidamente sem duplicar bonus.
  4. Cada jogo exibe timeline com marcadores, Momentos inline e spoilers ocultos ate revelacao explicita.
  5. A dupla pode agendar uma sessao, confirmar presenca, receber lembrete push 30 minutos antes e desativar push quando desejar.
**Plans**: 04-01, 04-02, 04-03, 04-04, 04-05, 04-06 (6/6 complete; `pnpm phase:4:gate` reports external blockers)

**Plan Waves**:
  - **Wave 1:** `04-01` - Play schema, RLS, domain policies, XP awards, jobs and module foundation.
  - **Wave 2 *(blocked on Wave 1 completion)*:** `04-02` - Jogando Agora dashboard, Principal/secondary roles and accessible reorder.
  - **Wave 3 *(blocked on Wave 2 completion)*:** `04-03`, `04-04` - Sessions/progress/terminal confirmation plus timeline, milestones, Momentos and spoilers.
  - **Wave 4 *(blocked on Wave 3 completion)*:** `04-05` - Scheduling, attendance, reminders, product push and Central da Dupla.
  - **Wave 5 *(blocked on Wave 4 completion)*:** `04-06` - Phase gate, E2E/security/performance evidence and reminder readiness.
**UI hint**: yes

### Phase 5: Gamificacao Coletiva
**Goal**: O progresso real da dupla se torna uma economia coletiva auditavel que celebra consistencia sem criar competicao interna.
**Depends on**: Phase 4
**Requirements**: PLAY-05, GAME-01, GAME-02, GAME-03, GAME-04, GAME-05, GAME-06, GAME-07, GAME-08, GAME-09, GAME-10, GAME-11, GAME-12, GAME-13, GAME-14, GAME-15, GAME-16, GAME-17, SAFE-03
**Success Criteria** (what must be TRUE):
  1. Dashboard mostra XP, nivel, streak, quests ativas e conquistas recentes como progresso unico da dupla.
  2. XP auditavel conduz a dupla por 50 niveis tematicos com curva versionada, sem totais individuais.
  3. A dupla pode desbloquear e filtrar aproximadamente 50 conquistas customizadas por grupo e raridade.
  4. Desafios semanais, mensais e sazonais rotacionam no horario correto e mostram progresso atual.
  5. Streaks exibem chama, freezing, backup ate 04:00 e Streak Freeze a cada dez niveis, enquanto raridade aparece de forma consistente.
**Plans**: 05-01, 05-02, 05-03, 05-04, 05-05, 05-06, 05-07, 05-08, 05-09, 05-10, 05-11 (11/11 complete; `pnpm phase:5:gate` passed on 2026-06-07)

**Plan Waves**:
  - **Wave 1:** `05-01` - Gamification schema, forced RLS, public module, policy/catalog/repository foundation.
  - **Wave 2 *(blocked on Wave 1 completion)*:** `05-02` - Reward engine, immediate transactional projections, Play/Discovery fact integration and reconciliation.
  - **Wave 3 *(blocked on Wave 2 completion)*:** `05-03` - Dashboard band, XP ledger and reward feedback in the home experience.
  - **Wave 4 *(blocked on Wave 3 completion)*:** `05-04` - Achievements route, filters, custom SVG icon system and navigation.
  - **Wave 5 *(blocked on Wave 4 completion)*:** `05-05` - Challenge/streak UI, rotation jobs, 04:00 cutoff and maintenance cron.
  - **Wave 6 *(blocked on Wave 5 completion)*:** `05-06` - Phase gate with E2E, accessibility, security, DB, performance and economy audits.
  - **Wave 7 *(gap closure; blocked on completed Waves 3, 5 and 6)*:** `05-07` - Secure ready-duo job producer foundation; `05-10` - authoritative signed reward feedback.
  - **Wave 8 *(blocked on Wave 7 plan 05-07)*:** `05-08` - Timezone-correct recurring quest/streak jobs with producer-to-completion integration.
  - **Wave 9 *(blocked on Wave 8)*:** `05-09` - Catalog-wide achievement predicate evaluation and 50/50 reachability gate.
  - **Wave 10 *(blocked on Waves 8 and 9)*:** `05-11` - Serialized projections and atomic additive quest progress under concurrency.
**UI hint**: yes

### Phase 6: Roleta E Economia
**Goal**: A dupla pode transformar a escolha do proximo jogo em uma roleta justa, autoritativa e visualmente memoravel.
**Depends on**: Phase 5
**Requirements**: ROUL-01, ROUL-02, ROUL-03, ROUL-04, ROUL-05, ROUL-06, ROUL-07, ROUL-08, ROUL-09, ROUL-10, SAFE-06
**Success Criteria** (what must be TRUE):
  1. A dupla pode abrir uma esteira de 60 capas com ponteiro central e revelar um resultado em aproximadamente 5.5 segundos.
  2. A revelacao usa audio opcional, bordas por raridade e particulas Legendary sem prejudicar usuarios que preferem menos movimento.
  3. Pity, boost de 100 XP e multiplicador de fim de semana afetam o resultado exatamente uma vez.
  4. O resultado e persistido antes da animacao, permanece consistente entre os dois membros e nao pode duplicar custos ou historico.
  5. A dupla pode travar o resultado como Jogando Principal.
**Plans**: 06-00, 06-01, 06-02, 06-03, 06-04, 06-05, 06-06, 06-07, 06-08, 06-09, 06-10, 06-11
**Plan Waves**:
  - **Wave 0:** `06-00` - Nyquist test, browser, DB, simulation and gate scaffolds.
  - **Wave 1:** `06-01`, `06-02` - Database/RLS foundation and roulette module policies/contracts.
  - **Wave 2:** `06-03` - Authoritative round creation, boost ledger materialization, pity, cooldown and state reads.
  - **Wave 3:** `06-04`, `06-06` - `/app/roleta` route shell/actions and Play public replacement contract.
  - **Wave 4:** `06-05`, `06-07` - Reveal UI/audio/reduced-motion/history and roulette lock/discard application behavior.
  - **Wave 5:** `06-08` - Route/UI/dashboard/Central wiring for lock, discard and replacement flows.
  - **Wave 6:** `06-09` - Focused tests, accessibility and deterministic economy simulation evidence.
  - **Wave 7:** `06-10` - Root Phase 6 gate and evidence artifacts.
  - **Wave 8:** `06-11` - Final gate execution and coverage closure.
**UI hint**: yes

### Phase 7: Hall, Stats E Lancamento
**Goal**: A dupla pode celebrar sua historia em um produto publico, responsivo, acessivel e pronto para ser compartilhado.
**Depends on**: Phase 6
**Requirements**: HALL-01, HALL-02, HALL-03, HALL-04, HALL-05, HALL-06, HALL-07, HALL-08, HALL-09, BRND-07, BRND-08, BRND-09, BRND-10, BRND-12, SEC-09, SEC-10, SEC-11, META-01, META-03, META-04, META-05, META-06, META-07, META-08
**Success Criteria** (what must be TRUE):
  1. Cada membro pode revisar um jogo concluido, ver as duas reviews lado a lado e consultar a media da dupla.
  2. A dupla pode revisitar jogos no Hall da Moral, usar uma alternativa plana acessivel e reproduzir sua historia por timeline.
  3. A dupla pode consultar horas coop, vibe match, jogo favorito e dias pareados sem qualquer ranking interno.
  4. Visitantes entendem o ritual pela landing curta, e links compartilhados exibem titulos, descricao, metadata, JSON-LD e OG image corretos.
  5. O produto final e instalavel como PWA, preserva acessibilidade e disciplina visual, e so lanca depois de ASVS Level 2, incident response e testes adversariais registrados.
**Plans**: TBD
**UI hint**: yes

## Quality Gates

These gates apply to every phase and cannot be deferred as polish:

- Architecture changes must preserve `.planning/ARCHITECTURE.md`; forbidden imports, deep imports and client/server leaks fail automated checks.
- Database changes must identify ownership, constraints, RLS impact, indexes, migration coverage and concurrency behavior.
- New endpoints and mutations must validate input, authorize the current session and include adversarial tests where relevant.
- Known critical or high security findings block phase completion.
- Changes to trust boundaries, protected assets or abuse cases update `.planning/SECURITY.md`.
- Phase 1 cannot complete without the foundation gate in `.planning/SECURITY.md`.
- Production launch cannot complete without the release gate in `.planning/SECURITY.md`.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 02.1 -> 3 -> 03.1 -> 03.2 -> 03.3 -> 4 -> 5 -> 6 -> 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Fundacao Modular, Marca, Auth E Dupla | 6/6 | Complete | 2026-06-03 |
| 01.1. Polimento Auth e Landing Intermediaria | 1/1 | Complete | 2026-06-03 |
| 2. Catalogo E Biblioteca | 3/3 | Complete | 2026-06-03 |
| 02.1. Localizacao e Qualidade do Catalogo | 3/3 | Complete    | 2026-06-03 |
| 3. Descoberta E Matches | 4/4 | Complete   | 2026-06-04 |
| 03.1. Refinos Visuais e UX da Descoberta | 4/4 | Complete   | 2026-06-04 |
| 03.2. Biblioteca Escalavel e Backlog Operacional | 4/4 | Complete   | 2026-06-05 |
| 03.3. Performance de Producao e UX de Latencia | 4/4 | Complete | 2026-06-05 |
| 4. Jogando Agora, Sessoes E Agendamento | 6/6 | Complete | 2026-06-05 |
| 5. Gamificacao Coletiva | 11/11 | Human verification | - |
| 6. Roleta E Economia | 0/12 | Planned | - |
| 7. Hall, Stats E Lancamento | 0/TBD | Not started | - |
