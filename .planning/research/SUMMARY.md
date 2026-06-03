# Project Research Summary

**Project:** QUEUE/2
**Domain:** Ritual colaborativo de backlog, descoberta e progresso de jogos coop
**Researched:** 2026-06-03
**Confidence:** HIGH

## Executive Summary

QUEUE/2 e um produto full-stack centrado em uma unidade de uso incomum e estrutural: exatamente dois jogadores. A arquitetura precisa tratar a dupla como tenant, identidade de progresso e fonte de toda gamificacao. O maior risco nao esta em desenhar telas isoladas, mas em manter pareamento, confirmacoes, XP, pity, streaks, jobs e stats coerentes quando os dois usuarios agem em momentos diferentes ou repetem requests.

A recomendacao e construir um monolito modular em Next.js App Router sobre Neon Postgres, com Better Auth self-hosted, Drizzle e acesso de dominio mediado pelo servidor. O repositorio usa `pnpm` workspaces e um Turborepo enxuto para `apps/web`, banco, UI e configuracoes compartilhadas, sem separar o produto em microfrontends. O prototipo Lovable permanece como referencia visual, mas TanStack Start ainda esta em Release Candidate; como o repositorio e greenfield, Next.js oferece uma base mais conservadora para deploy, metadata, PWA, Route Handlers e integracao Vercel.

O produto deve usar transacoes, ledger de XP, eventos/outbox e RLS como defesa em profundidade desde a fundacao. Dados externos precisam ser tratados com cuidado: RAWG exige atribuicao e nao redistribuicao, nao ha API publica oficial de HLTB identificada e Game Pass nao deve ser apresentado como dado em tempo real sem fonte. A interface deve reservar espetaculo para momentos especiais e manter as tarefas diarias calmas, acessiveis e rapidas.

## Key Findings

### Recommended Stack

Use pnpm 11.5.1, Turborepo 2.9.16, Next.js 16.2.7, React 19.2.7, TypeScript 5.9.3, Tailwind CSS 4.3.0, Better Auth 1.6.14, Drizzle ORM 0.45.2 e Neon Postgres. Hospede na Vercel, alinhe a regiao das Functions ao Neon e use Vercel Cron apenas como runner de jobs persistidos.

**Core technologies:**
- **Next.js App Router:** framework full-stack estavel com routing, server boundary, metadata, OG e PWA.
- **pnpm + Turborepo:** workspaces e tarefas com fronteiras uteis, cache e dependencias locais explicitas.
- **Neon Postgres:** fonte de verdade para dados relacionais, transacoes, constraints e RLS.
- **Better Auth self-hosted:** controle total da autenticacao e UX sem depender de Neon Auth Beta.
- **Drizzle ORM:** schema e queries tipadas sem esconder SQL avancado.
- **Motion + dnd-kit:** interacoes de alto impacto e reorder acessivel.

### Expected Features

**Must have (table stakes):**
- Auth confiavel, pareamento seguro e configuracoes.
- Catalogo pesquisavel, detalhe de jogo e biblioteca por status.
- Plataformas comuns, responsividade, acessibilidade e PWA.

**Should have (competitive):**
- Tudo pertence a dupla, inclusive XP, stats e confirmacoes.
- Cinco modos de descoberta e roleta case opening.
- Jogando Agora, sessoes live/offline, progresso e agendamento.
- Conquistas, quests, streaks, raridades e Hall da Moral.
- Identidade QUEUE/2 brutalista editorial com espetaculo pontual.

**Defer (v2+):**
- Steam import, chat, voice, app nativo, grupos 3+, modo solo e leaderboards publicos.

### Architecture Approach

O servidor e a unica autoridade para regras de dominio. Toda mutacao critica valida sessao e membership, roda em transacao e registra uma causa idempotente. RLS limita linhas por dupla como defesa em profundidade. Ledger e eventos tornam XP, achievements, jobs, notificacoes e replay auditaveis. Dashboard, Hall e stats sao leituras derivadas de sessoes e eventos, nao totais editaveis.

**Major components:**
1. **App Router UI** - paginas publicas, app autenticado, metadata e composicao adaptativa.
2. **Auth and server boundary** - Better Auth, validacao, autorizacao e handlers.
3. **Domain services** - pareamento, biblioteca, sessoes, gamificacao e roleta.
4. **Neon Postgres** - schemas, constraints, RLS, ledger, eventos e read models.
5. **Job and integration adapters** - RAWG, Resend, Web Push e runner agendado.

### Critical Pitfalls

1. **Vazamento entre duplas** - autorizar no servidor, aplicar RLS e testar com tenants adversariais.
2. **Terceiro membro por concorrencia** - aceitar convite em transacao com lock e constraints.
3. **XP e pity duplicados** - usar ledger, idempotency keys e eventos transacionais.
4. **Roleta manipulavel** - persistir resultado antes da animacao cliente.
5. **Jobs perdidos** - cron apenas acorda uma fila persistida com retry e observabilidade.
6. **Dados externos mal representados** - atribuir RAWG e registrar fonte/frescor de estimativas e disponibilidade.
7. **UX visualmente cansativa** - utilidade calma, espetaculo pontual e reduced motion.

## Implications for Roadmap

### Phase 1: Fundacao, Marca, Auth E Dupla
**Rationale:** Toda feature depende de identidade, membership e isolamento corretos.
**Delivers:** Scaffold Next.js, tokens QUEUE/2, Better Auth, perfil, pareamento, schema base, RLS e testes de isolamento.
**Addresses:** Auth, identidade, dupla fixa e seguranca.
**Avoids:** Vazamento entre duplas e terceiro membro.

### Phase 2: Catalogo E Biblioteca
**Rationale:** Descoberta, roleta e sessoes precisam de jogos normalizados e backlog real.
**Delivers:** RAWG sync, atribuicao, busca, detalhe, plataformas, statuses, tempo estimado e disponibilidade com fonte.
**Addresses:** Catalogo, wishlist, biblioteca e filtros base.
**Avoids:** Dependencia incorreta de RAWG, HLTB e Game Pass.

### Phase 3: Descoberta E Matches
**Rationale:** Depois que o catalogo e as acoes existem, o ritual de escolher pode ser construido.
**Delivers:** Swipe, match live, surpresa, mood quiz, autocomplete, filtros e recomendacao inicial.
**Addresses:** Construcao da fila e decisao compartilhada.
**Avoids:** Recomendacao sem cold-start ou plataforma comum.

### Phase 4: Jogando Agora, Sessoes E Agendamento
**Rationale:** O produto precisa conectar a escolha ao ato real de jogar antes de premiar comportamento.
**Delivers:** Principal/secundarios, reorder, live timer, Jogamos Hoje, timeline, progresso, milestones, notas, spoilers, push e confirmacoes.
**Addresses:** Registro e compromisso compartilhado.
**Avoids:** Timer cliente, premios duplicados e jobs frageis.

### Phase 5: Gamificacao Coletiva
**Rationale:** Gamificacao deve se apoiar em eventos reais ja confiaveis.
**Delivers:** XP ledger, 50 niveis, achievements, quests, streaks, freezes, raridade e celebracoes.
**Addresses:** Progresso coletivo e retencao.
**Avoids:** Economia sem auditoria e regras de raridade instaveis.

### Phase 6: Roleta E Economia
**Rationale:** A roleta depende de biblioteca, raridade, XP e historico autoritativos.
**Delivers:** Esteira de 60 capas, pity, boost, multiplicador, audio, particulas e lock Principal.
**Addresses:** Ritual memoravel de escolha.
**Avoids:** Resultado manipulavel ou divergente.

### Phase 7: Hall, Stats, Reviews E Lancamento
**Rationale:** A celebracao final depende do historico produzido por todas as fases anteriores.
**Delivers:** Reviews lado a lado, Hall 3D com fallback, replay, stats, landing, SEO, OG, favicons, manifest e polish final.
**Addresses:** Memoria compartilhada, descoberta publica e qualidade de produto.
**Avoids:** Stats divergentes, Hall inacessivel e visual generico.

### Phase Ordering Rationale

- Auth e dupla precedem qualquer dado privado.
- Catalogo e biblioteca precedem descoberta, roleta e sessoes.
- Sessoes precedem gamificacao para que premios representem comportamento real.
- Gamificacao precede roleta porque pity, boost e raridade fazem parte da economia.
- Hall e stats fecham o ciclo usando historico autoritativo ja existente.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** desenho exato de RLS com Better Auth self-hosted e role de aplicacao.
- **Phase 2:** contrato RAWG, normalizacao e estrategia de fonte para tempo/disponibilidade.
- **Phase 3:** recomendacao cold-start e match score.
- **Phase 4:** push web, jobs e regras de timezone.
- **Phase 5:** balanceamento de XP, niveis, quests, streaks e raridades.
- **Phase 6:** algoritmo de roleta preselecionada, audio e reduced motion.

Phases with standard patterns:
- **Phase 7:** metadata Next.js, OG image, manifest e SEO possuem documentacao madura, embora o design exija auditoria.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Decisoes principais verificadas em documentacao oficial e registry. |
| Features | HIGH | O usuario definiu o Plano Final v7 com alto nivel de detalhe. |
| Architecture | HIGH | Postgres, RLS, transacoes, Next.js e Better Auth possuem padroes bem documentados. |
| Pitfalls | HIGH | Riscos derivam diretamente de invariantes do produto e limites oficiais das integracoes. |

**Overall confidence:** HIGH

### Gaps to Address

- **Tempo estimado:** confirmar fonte licenciada ou adotar RAWG playtime/manual override sem usar a marca HLTB.
- **Game Pass/free:** definir processo de curadoria e copy de frescor; nao ha API publica oficial identificada.
- **Vercel plan:** lembretes precisos exigem frequencia que o plano Hobby nao oferece.
- **Balanceamento:** XP, pity, raridade e quests precisam de simulacao e ajuste durante implementacao.
- **Recomendacao colaborativa:** so deve ganhar peso depois de haver dados suficientes.

## Sources

### Primary (HIGH confidence)

- https://nextjs.org/docs/app - App Router, metadata, PWA e testes.
- https://tanstack.com/start/latest/docs/framework/react/overview - status Release Candidate.
- https://better-auth.com/docs/integrations/next - integracao Next.js.
- https://better-auth.com/docs/authentication/email-password - verificacao e reset.
- https://better-auth.com/docs/concepts/rate-limit - rate limiting.
- https://neon.com/docs/auth/overview - Neon Auth Beta e self-hosting Better Auth.
- https://neon.com/docs/data-api/overview - Data API Beta.
- https://neon.com/docs/guides/row-level-security - RLS.
- https://orm.drizzle.team/docs/connect-neon - Drizzle com Neon.
- https://vercel.com/docs/cron-jobs/manage-cron-jobs - cron, seguranca e ausencia de retry.
- https://vercel.com/docs/limits/overview - limites por plano.
- https://rawg.io/apidocs - API, atribuicao e termos.
- https://api-docs.igdb.com/ - endpoint de tempo e condicoes de uso comercial.
- https://www.postgresql.org/docs/current/ddl-rowsecurity.html - RLS Postgres.
- https://www.postgresql.org/docs/current/sql-createfunction.html - funcoes seguras.

---
*Research completed: 2026-06-03*
*Ready for roadmap: yes*
