# QUEUE/2

## What This Is

QUEUE/2, lido como "queue dois", e um produto web publico para duplas fixas de jogadores organizarem o backlog real de jogos que querem zerar juntas. O app transforma a indecisao sobre o proximo coop em um ritual compartilhado: descobrir jogos, formar matches, sortear a fila, jogar, registrar progresso e celebrar cada zerada.

O nome comunica as duas camadas centrais do produto: `Queue` e a fila de jogos da dupla; `/2` determina que toda experiencia pertence a exatamente dois jogadores. A tagline e: **"A fila e nossa."**

## Core Value

A dupla vive um ritual completo e memoravel para descobrir, escolher, jogar e celebrar jogos coop junta.

## Requirements

### Validated

(None yet - ship to validate)

### Active

- [ ] Qualquer dupla pode criar contas, se parear por codigo e manter uma identidade compartilhada.
- [ ] A dupla pode construir uma fila real de jogos por descoberta, busca, matches e wishlist.
- [ ] A dupla pode escolher o proximo jogo por uma roleta case opening com regras de raridade e pity.
- [ ] A dupla pode acompanhar ate tres jogos em andamento, registrar sessoes e progredir ate zerar ou dropar.
- [ ] A dupla recebe XP, niveis, conquistas, quests, streaks e celebracoes como progresso coletivo.
- [ ] A dupla pode revisitar sua historia no Hall da Moral e acompanhar estatisticas colaborativas.
- [ ] Toda a experiencia publica e autenticada expressa a identidade visual QUEUE/2 com qualidade de produto final.
- [ ] O backend protege dados por dupla, executa regras transacionais e integra o catalogo RAWG com seguranca.

### Out of Scope

- Importacao de perfil Steam - futura expansao, nao necessaria para validar o ritual central.
- Chat in-app - a dupla ja possui seus canais de comunicacao e chat desviaria o foco.
- Voice chat - fora da proposta de organizacao e celebracao do backlog.
- Aplicativo nativo - a primeira versao sera web responsiva.
- Grupos de tres ou mais jogadores - `/2` e uma restricao de produto e de marca.
- Modo solo - toda sessao e todo progresso pertencem a dupla.
- Leaderboards publicos - a gamificacao e colaborativa, nao competitiva.

## Context

### Audience And Product Intent

- QUEUE/2 nasce como produto publico para qualquer dupla de jogadores, nao apenas para a dupla criadora.
- O Plano Final v7 inteiro compoe o escopo da primeira versao. O roadmap pode dividir a entrega em fases, mas nenhuma area descrita abaixo e tratada como mero "futuro talvez".
- O produto deve servir tanto duplas que ja possuem um backlog grande quanto duplas que querem descobrir novos coops.
- A experiencia deve reduzir indecisao, incentivar compromisso sem culpa e transformar zeradas em memoria compartilhada.
- Nao existe competicao interna: XP, progresso, stats, streaks e celebracoes sao da dupla.

### Brand Meaning

- `QUEUE` e o backlog real da dupla e o motor funcional do app.
- `/2` significa exatamente dois jogadores, sempre, e funciona como brand mark curto, brutalista e terminal-ish.
- A linguagem de marca deve soar direta, densa e confiante, sem parecer generica, infantil ou excessivamente gamer.
- Tagline oficial: **"A fila e nossa."**

### Visual Identity

#### Logo And Brand Mark

- Wordmark principal: `QUEUE` em Archivo Black uppercase, tracking aproximado de `-0.04em`, com escala dominante.
- `/2` em JetBrains Mono Bold, com a mesma altura visual, colado na ultima letra e levemente deslocado abaixo da linha de base.
- O `/2` recebe acid lime como unica cor do wordmark; o restante usa off-white ou grafite conforme o fundo.
- Variacoes previstas: assinatura em uma linha, ratio fixo e baseline alinhada; versao stacked com `QUEUE` acima e `/2` grande abaixo.
- Brand mark: apenas `/2` em quadrado de canto sharp com raio de 4px, fundo grafite com grain SVG e lime com efeito interno engraved, nunca outer glow generico.
- Assets previstos: favicon 16/32/48, apple-touch 180, PWA 512 e 1024. Pulse sutil do lime no favicon pode existir no idle a cada tres segundos.

#### Open Graph And Loading

- OG image 1200x630 com fundo grafite e grain, wordmark monumental, tres capas em perspectiva com blur sutil e texto pequeno com tagline e URL.
- Loading state usa `/2` sendo desenhado via SVG stroke animation, com texto opcional "Carregando a fila..."; nao usar spinner padrao.

#### Recurring Visual Element

- Um ponteiro de roleta estilizado, formado por triangulo sharp e ponta de losango, funciona como icone secundario.
- Ele aparece como divisor de secoes, indicador de jogo da vez e bullet de listas.
- Usa acid lime ou violet shock conforme significado.

### Design Tokens

- Display: Archivo Black, uppercase e tracking apertado.
- Body: Inter Tight, com densidade limpa e legivel.
- Mono, numerais e `/2`: JetBrains Mono.
- `--bg`: `oklch(0.16 0.025 285)`
- `--surface`: `oklch(0.21 0.03 285)`
- `--ink`: `oklch(0.96 0.015 95)`
- `--ink-muted`: `oklch(0.72 0.02 95)`
- `--primary`: `oklch(0.86 0.22 128)`
- `--accent`: `oklch(0.62 0.27 305)`
- Raridades: common `oklch(0.70 0.02 280)`, rare `oklch(0.78 0.16 220)`, epic `oklch(0.65 0.25 340)`, legendary `oklch(0.82 0.18 80)`.
- Spacing: 4/6/8/12/16/24/32/48/72/112.
- Radius: 4px ou 999px.
- Grain SVG pode ser global; scanlines aparecem apenas na roleta.

### UI/UX Direction

- O prototipo publicado em `https://queue2.lovable.app/` e uma semente visual, nao o alvo final.
- A direcao final e **brutalismo editorial com capas de jogos como principal fonte de cor**.
- A interface utilitaria deve ser calma, legivel e eficiente. Alta energia visual fica reservada para roleta, matches, conquistas, level-up, sessoes live e zeradas.
- A UI nao inventa uma paleta ampla: as capas trazem variedade cromatica; lime indica acao, progresso e importancia; violet shock e contraste secundario ou evento especial.
- Bordas sao sharp, radius e raro, e a composicao evita cards aninhados, tiles genericos e excesso de glow.
- Glow so tem significado quando representa raridade, roleta, conquista ou estado live.
- A landing usa scrollytelling curto: hero monumental, mini-roleta, ritual da dupla, dashboard, Hall da Moral e CTA.
- A experiencia possui as mesmas capacidades em mobile e desktop, mas nao a mesma composicao.
- Mobile-first orienta sessoes, confirmacoes e uso diario; desktop ganha mais densidade para descoberta, biblioteca e stats.
- Motion deve ter proposito, com easing controlado e suporte a `prefers-reduced-motion`.
- O processo visual usara Impeccable como disciplina de `shape`, `critique`, `audit` e `polish`, sem substituir a identidade propria do QUEUE/2.

### Core Product Principle: Everything Belongs To The Duo

- Nao existe sessao solo.
- Toda sessao e coop.
- Existe um unico XP da Dupla, sem XP individual.
- Reviews aparecem lado a lado, mas o score final do jogo e a media.
- Estatisticas sao colaborativas e nunca competitivas.
- Transicoes importantes, como Zerado e Dropado, exigem confirmacao dupla.

### Playing Now System

- O dashboard possui um card hero "Jogando Agora" com capa hi-res, blur e gradiente.
- A dupla pode manter ate tres jogos em `Jogando`: um Principal e dois secundarios, com drag-to-reorder.
- Sessao Live possui cronometro, confirmacao dos dois jogadores e bonus de 30 XP.
- "Jogamos Hoje" registra uma sessao offline rapidamente, em aproximadamente dois cliques.
- Cada jogo possui timeline de sessoes com marcadores especiais, incluindo primeira sessao, sessao noturna e maratona.
- Milestones automaticos incluem 50% e 100% do tempo estimado, "Voces tao viciados" e lembrete de Pausar.
- O progresso possui tres camadas: tempo coop comparado a um tempo estimado com fonte identificada, capitulos manuais com 25 XP por capitulo e percentual subjetivo.
- A dupla pode agendar sessao com push 30 minutos antes e recebe 100 XP se ambos confirmarem.
- A dupla pode anotar Momentos inline e marcar spoilers.
- Zerado e Dropado exigem confirmacao dupla.

### Deep Gamification

- XP da Dupla alimenta 50 niveis tematicos, de `Lv1 Casuais` ate `Lv50 Lendas do Coop`, com curva aproximada de multiplicacao por 1.18.
- Aproximadamente 50 conquistas usam icones SVG customizados no estilo engraved badge, sem emoji.
- Conquistas sao agrupadas em Story, Coop-Sincronia, Compromisso, Descoberta, Streak, Roleta e Comedia.
- Quests incluem tres semanais com reset segunda-feira 00h, uma mensal e sazonais como Spooky, Awards e Anniversary.
- Streaks possuem chama animada, efeito de freezing, Streak Freeze a cada 10 niveis e backup ate 04h.
- Jogos, conquistas e reviews podem ter raridade, representada por bordas neon com gradiente.
- A roleta possui pity: dez resultados sem Epic ou superior garantem um resultado qualificado.
- A dupla pode gastar 100 XP em boost.
- Fins de semana aplicam multiplicador de 20%.
- O Hall da Moral usa estante 3D com CSS perspective e replay timeline.
- `/app/dupla` apresenta horas coop, vibe match, jogo favorito e dias pareados.

### Discovery

- Existem cinco modos de descoberta:
  1. Swipe duplo.
  2. Match live com push.
  3. Surpresa a partir de pool ainda nao visto.
  4. Quiz de mood com tres perguntas.
  5. Busca com autocomplete.
- Filtros incluem tempo estimado, plataforma comum detectada automaticamente, tipo de coop, mood, ano, genero, raridade e disponibilidade free/Game Pass.
- Recomendacoes combinam similaridade de tags e filtragem colaborativa.
- Estados de biblioteca: Wishlist, Jogando, Zerado, Dropado e Pausado.

### Roulette Case Opening

- A roleta usa uma esteira horizontal de 60 capas e ponteiro central neon baseado no glifo secundario do app.
- A animacao usa Framer Motion com `cubic-bezier(.15,.85,.25,1)` e duracao aproximada de 5.5 segundos.
- Web Audio fornece tick, drumroll e fanfare.
- Bordas neon representam raridade; Legendary recebe particulas.
- Pity, boost e multiplicador de fim de semana afetam o resultado.
- A dupla pode travar o resultado como `Jogando Principal`.

### Screens

- `/` - landing com hero `/2` monumental, mini-roleta, tres passos e teaser do Hall.
- `/login` - entrada.
- `/cadastro` - criacao de conta.
- `/parear` - pareamento por codigo de dupla.
- `/app` - dashboard com Jogando Hero, XP, streak, quests e conquistas recentes.
- `/app/descobrir` - cinco modos de descoberta.
- `/app/roleta` - roleta case opening.
- `/app/biblioteca` - backlog por status e match score.
- `/app/jogo/:slug` - detalhe, sessoes, checkpoints e milestones.
- `/app/sessao/:id` - overlay de sessao live.
- `/app/hall-da-moral` - estante 3D e replay.
- `/app/conquistas` - grid filtravel por raridade.
- `/app/desafios` - quests semanais, mensais e sazonais.
- `/app/dupla` - stats colaborativos.
- `/app/perfil` - configuracoes de perfil.

### SEO And Metadata

- O root da aplicacao inclui `og:site_name` como `QUEUE/2`, `og:type` como `website` e JSON-LD `WebSite`.
- Titulos seguem `[Page] - QUEUE/2`.
- Description padrao: `A fila e nossa. Descubram, sorteiem e zerem coops juntos.`
- A implementacao inclui OG image 1200x630, favicon `.ico`, favicon SVG, apple-touch icon e manifest.

### Backend And Data Architecture

- Lovable Cloud foi removido da arquitetura.
- Next.js App Router e a base full-stack da aplicacao, com deploy e funcoes de servidor na Vercel.
- Neon Postgres e o banco principal.
- Better Auth self-hosted e o sistema de autenticacao, executado no runtime da aplicacao e usando o mesmo Neon Postgres.
- Drizzle ORM e a camada tipada de schema, queries e migrations, com SQL explicito para RLS, funcoes e constraints avancadas.
- Better Auth deve ter suas tabelas em schema dedicado, como `auth`, separado das tabelas de dominio.
- A UI de autenticacao e customizada para QUEUE/2; nao usar UI generica de provedor.
- A primeira versao suporta email e senha, verificacao de email, recuperacao de senha e gerenciamento de sessoes.
- Better Auth deve usar rate limiting persistente adequado a ambiente serverless e configuracao segura de trusted origins, secrets e cookies.
- Um provedor de email transacional sera configurado para verificacao e recuperacao.
- Acesso a dados de dominio e mediado pelo servidor por padrao. Qualquer acesso direto futuro via Neon Data API exige avaliacao explicita, pois a Data API ainda esta em Beta.
- PostgreSQL RLS e funcoes SQL fornecem defesa em profundidade para isolamento por dupla.
- O helper `has_duo_membership(uid, duo_id)` deve ser `security definer`, cuidadosamente restrito e usado para evitar recursao nas policies.
- Funcoes transacionais aplicam XP, level, quests e achievements de forma atomica.
- Jobs agendados e integracoes externas rodam em runtime de servidor, nao no cliente.
- RAWG e a fonte inicial do catalogo de jogos; `RAWG_API_KEY` ja foi recebida e deve permanecer somente no servidor.
- Paginas que usam dados ou imagens RAWG devem manter atribuicao e hyperlink ativo conforme os termos do provedor.
- Tempo de conclusao e tratado como `tempo estimado`, com fonte, frescor e override manual; a marca HLTB nao e usada sem integracao oficial ou permissao.
- Disponibilidade free/Game Pass e tratada como dado curado e potencialmente desatualizado, sempre com fonte e data de verificacao.
- Branches Neon devem separar desenvolvimento, previews/testes e producao.

### Initial Domain Tables

- `profiles`
- `duos` (`code`, `paired_at`, `xp`, `level`, `streak`)
- `duo_members` com constraint de no maximo dois membros
- `games_catalog` com sincronizacao RAWG
- `user_game_actions`
- `duo_matches` como view
- `game_status` (`is_principal`, `sort_order`)
- `play_sessions` (`started_at`, `ended_at`, `is_live`, `both_confirmed`, `duration`, `mood`, `note`)
- `session_checkpoints`
- `scheduled_sessions`
- `game_reviews`
- `inline_notes` com spoiler flag
- `roulette_history`
- `achievements_catalog` com aproximadamente 50 seeds
- `duo_achievements`
- `quests_catalog`
- `quest_progress`
- `notifications`
- `duo_xp_ledger` para auditoria e idempotencia de XP
- `domain_events` para efeitos derivados, replay e outbox
- `scheduled_jobs` para jobs vencidos, tentativas, locks e erros
- `push_subscriptions` por usuario e dispositivo
- `game_availability` com fonte e data de verificacao
- `game_time_estimates` com fonte e override

### Scheduled And External Work

- Sincronizacao diaria do catalogo RAWG.
- Verificacao de streaks.
- Rotacao de quests semanais, mensais e sazonais.
- Envio de lembretes e push de sessoes agendadas.
- Processos privilegiados usam funcoes de servidor e nunca expoem secrets ao cliente.

## Constraints

- **Product model**: Cada duo possui exatamente dois jogadores - `/2` e uma promessa de produto, nao apenas branding.
- **Collaboration**: Nao existe progresso individual competitivo - toda gamificacao deve reforcar a dupla.
- **Release scope**: Todo o Plano Final v7 pertence a v1 - fases organizam a construcao, mas nao removem funcionalidades previstas.
- **Platform**: Web responsiva primeiro - aplicativo nativo esta fora de escopo.
- **Database**: Neon Postgres substitui Lovable Cloud - dados, migrations e isolamento devem ser projetados para PostgreSQL.
- **Authentication**: Better Auth self-hosted substitui Neon Auth e Clerk - a equipe assume operacao e configuracao segura do sistema de auth.
- **Framework**: Next.js App Router e Vercel formam a base de producao - o prototipo Lovable permanece apenas como referencia visual.
- **Security**: Dados de uma dupla nunca podem vazar para outra - autorizacao de servidor e RLS devem ser verificadas.
- **Secrets**: `RAWG_API_KEY`, credenciais de email, secrets de auth e conexoes privilegiadas permanecem no servidor.
- **External data**: RAWG exige atribuicao; tempo estimado e disponibilidade precisam expor fonte e frescor.
- **Visual quality**: UI deve parecer produto intencional e proprio, nao template SaaS ou arcade neon generico.
- **Accessibility**: Contraste, foco, touch targets e reduced motion nao podem ser sacrificados pela estetica.
- **Language**: A experiencia principal e escrita em portugues brasileiro.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Nome `QUEUE/2` e tagline "A fila e nossa." | Resume backlog compartilhado e dupla fixa em uma marca curta e memoravel | - Pending |
| Produto publico para qualquer dupla desde a primeira versao | A visao nao e uma ferramenta privada; deve funcionar como produto reutilizavel | - Pending |
| Ritual completo como valor central | Descoberta, escolha, jogo, registro e celebracao devem formar uma experiencia unica | - Pending |
| Todo o Plano Final v7 e escopo de v1 | O usuario quer a visao completa antes de considerar a primeira versao concluida | - Pending |
| Brutalismo editorial com capas como fonte de cor | Mantem personalidade forte sem transformar toda a UI em arcade neon | - Pending |
| Utilidade calma e espetaculo pontual | Preserva legibilidade diaria e aumenta o impacto de momentos especiais | - Pending |
| Landing em scrollytelling curto | Explica o ritual sem virar uma pagina longa ou uma landing abstrata demais | - Pending |
| Mobile-first com desktop mais denso | Mobile acompanha sessoes; desktop favorece descoberta, biblioteca e stats | - Pending |
| Impeccable como processo de qualidade visual | Fornece disciplina para shape, critique, audit e polish sem impor uma estetica | - Pending |
| Neon Postgres no lugar de Lovable Cloud | Mantem Postgres como base portavel e adequada a regras transacionais e RLS | - Pending |
| Better Auth self-hosted no lugar de Neon Auth e Clerk | Evita depender de Neon Auth Beta e preserva controle sobre UX e extensibilidade | - Pending |
| Acesso de dominio mediado pelo servidor por padrao | Evita tornar Neon Data API Beta uma dependencia critica da v1 | - Pending |
| RLS por dupla como defesa em profundidade | Isolamento de dados e requisito estrutural do produto | - Pending |
| Next.js App Router e Vercel como base de producao | O repositorio e greenfield e TanStack Start ainda esta em Release Candidate; a base escolhida reduz risco operacional | - Pending |
| Drizzle ORM com SQL explicito para recursos avancados | Mantem queries tipadas sem esconder transacoes, RLS e constraints de Postgres | - Pending |
| `tempo estimado` no lugar de HLTB obrigatorio | Nao foi identificada API publica oficial de HLTB; a UI deve representar apenas dados com fonte permitida | - Pending |
| Dados de disponibilidade com fonte e frescor | Game Pass e ofertas mudam e nao devem parecer verdade em tempo real sem verificacao | - Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-03 after project research*
