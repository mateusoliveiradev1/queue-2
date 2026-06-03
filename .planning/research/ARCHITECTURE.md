# Architecture Research

**Domain:** Aplicacao full-stack multi-tenant por dupla com regras transacionais
**Researched:** 2026-06-03
**Confidence:** HIGH

## Standard Architecture

### System Overview

```text
+------------------------------------------------------------------+
|                         Next.js App Router                       |
|  Landing | Auth UI | App Shell | Server Components | Client UI  |
+-------------------------------+----------------------------------+
                                |
                                v
+------------------------------------------------------------------+
|                    Server Application Boundary                   |
| Route Handlers | Server Actions | Better Auth | Domain Services |
| Validation     | Authorization  | Transactions | Query Services |
+-------------------------------+----------------------------------+
                                |
                                v
+------------------------------------------------------------------+
|                          Neon Postgres                           |
| auth schema | domain tables | RLS | SQL functions | event/outbox |
+----------------------+----------------------+--------------------+
                       |                      |
                       v                      v
+-----------------------------+  +---------------------------------+
| External Integrations       |  | Scheduled Workers               |
| RAWG | Resend | Web Push    |  | Vercel Cron -> due job runner  |
+-----------------------------+  +---------------------------------+
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| App Router UI | Paginas, layouts, metadata e composicao adaptativa | Server Components por padrao; Client Components apenas onde ha interacao. |
| Better Auth | Cadastro, login, verificacao, reset e sessoes | Handler em Route Handler e tabelas no schema `auth`. |
| Domain services | Regras de pareamento, status, sessoes, XP, pity e confirmacoes | Funcoes de servidor com validacao, autorizacao e transacao. |
| Query services | Leitura otimizada para dashboard, biblioteca, jogo e stats | Queries tipadas e read models derivados de dados autoritativos. |
| Neon Postgres | Persistencia, constraints, RLS e auditoria | Drizzle para schema/query e SQL explicito para recursos avancados. |
| Event/outbox worker | Efeitos derivados e jobs confiaveis | Tabela de eventos/jobs idempotentes processada por runner agendado. |
| Catalog sync | Importar e normalizar dados permitidos da RAWG | Job server-only com atribuicao e metadados de origem. |

## Recommended Project Structure

```text
src/
|-- app/
|   |-- (public)/                 # landing, login, cadastro e parear
|   |-- app/                      # area autenticada
|   |-- api/auth/[...all]/        # Better Auth handler
|   |-- api/cron/                 # runners protegidos
|   |-- layout.tsx                # metadata global e fontes
|   `-- opengraph-image.tsx       # OG image
|-- components/
|   |-- brand/                    # wordmark, /2, grain e pointer
|   |-- ui/                       # primitivos reestilizados
|   `-- game/                     # capa, raridade e estados
|-- features/
|   |-- duo/
|   |-- catalog/
|   |-- discovery/
|   |-- sessions/
|   |-- gamification/
|   |-- roulette/
|   `-- hall/
|-- server/
|   |-- auth/
|   |-- db/
|   |-- domain/
|   |-- jobs/
|   `-- integrations/
|-- db/
|   |-- schema/
|   |-- migrations/
|   `-- seeds/
|-- lib/
|-- styles/
`-- tests/
    |-- unit/
    |-- integration/
    `-- e2e/
```

### Structure Rationale

- **`app/`:** Mantem convencoes Next.js para routing, metadata, OG e handlers.
- **`features/`:** Agrupa UI e comportamento por dominio do produto, evitando uma pasta de componentes sem ownership.
- **`server/domain/`:** Centraliza regras que nunca podem depender do cliente.
- **`db/`:** Torna schema, migrations, policies e seeds revisaveis.
- **`tests/`:** Separa regras puras, integracao Postgres/RLS e jornadas completas.

## Architectural Patterns

### Pattern 1: Server-Mediated Domain Mutation

**What:** Toda mutacao de dominio valida sessao, membership, entrada e invariantes no servidor.
**When to use:** Status de jogo, sessao, XP, quest, achievement, roleta, pareamento e confirmacoes.
**Trade-offs:** Mais codigo de servidor, mas elimina autoridade indevida do cliente.

```typescript
await withDuoTransaction(session.user.id, duoId, async (tx) => {
  await assertCanChangeGameStatus(tx, duoId, gameId);
  await updateGameStatus(tx, duoId, gameId, nextStatus);
  await appendDomainEvent(tx, { type: "game.status.changed", duoId, gameId });
});
```

### Pattern 2: Transactional Ledger And Outbox

**What:** Premios e efeitos derivados sao registrados junto da mudanca principal.
**When to use:** XP, achievements, quests, push, lembretes e celebracoes.
**Trade-offs:** Requer worker e idempotencia, mas evita premio duplicado ou notificacao perdida.

```typescript
await tx.insert(duoXpLedger).values({
  duoId,
  amount: 30,
  reason: "live_session_confirmed",
  idempotencyKey: `session:${sessionId}:live-bonus`,
});
```

### Pattern 3: RLS As Defense In Depth

**What:** A aplicacao autoriza no servidor e Postgres tambem restringe linhas por dupla.
**When to use:** Toda tabela com `duo_id`.
**Trade-offs:** Policies exigem testes e contexto de sessao correto; o ganho e reduzir impacto de bugs de query.

### Pattern 4: Authoritative Result, Client Reveal

**What:** A roleta seleciona e persiste o resultado antes de iniciar a animacao.
**When to use:** Qualquer experiencia aleatoria com custo, pity ou premio.
**Trade-offs:** A UI precisa animar ate um resultado predefinido, mas fraude e divergencia sao evitadas.

### Pattern 5: Derived Read Models

**What:** Dashboard, Hall e stats leem dados derivados de eventos e sessoes, sem permitir edicao manual de totais.
**When to use:** Horas coop, jogo favorito, streaks, nivel e replay.
**Trade-offs:** Algumas queries podem precisar de views/materializacao depois, mas a fonte de verdade permanece clara.

## Data Flow

### Request Flow

```text
User action
  -> Client or Server Component
  -> Route Handler / Server Action
  -> Better Auth session
  -> Zod validation
  -> duo membership authorization
  -> transaction + domain service
  -> Neon Postgres + RLS
  -> revalidate response/read model
```

### State Management

```text
Neon Postgres is authoritative
  -> Server Components render initial state
  -> Client interactions use local ephemeral state
  -> Mutations return canonical result
  -> SWR/polling revalidates shared state where needed
```

### Key Data Flows

1. **Pareamento:** usuario autenticado cria ou aceita convite; transacao bloqueia a dupla, valida limite de dois e grava membership.
2. **Descoberta:** cada usuario registra acao; query/view calcula match da dupla; evento dispara notificacao quando apropriado.
3. **Sessao live:** servidor grava `started_at`; clientes exibem tempo derivado; encerramento e confirmacao dupla concedem XP uma vez.
4. **Roleta:** servidor valida pool e economia, seleciona resultado, atualiza pity/XP/historico e devolve dados para a animacao.
5. **Jobs:** cron chama runner protegido; runner bloqueia jobs vencidos, processa com idempotencia e registra tentativas.

## Data Model Additions

As tabelas iniciais do PROJECT.md devem ser complementadas por:

| Table | Purpose |
|-------|---------|
| `duo_xp_ledger` | Auditoria e idempotencia de cada alteracao de XP. |
| `domain_events` | Eventos transacionais para efeitos derivados e replay. |
| `scheduled_jobs` | Jobs vencidos, tentativas, locks e erros. |
| `push_subscriptions` | Endpoints e chaves por usuario/dispositivo. |
| `game_availability` | Disponibilidade curada com fonte e `last_checked_at`. |
| `game_time_estimates` | Tempo estimado neutro com fonte, tipo e override. |
| `duo_preferences` | Timezone, audio, reduced motion e preferencias compartilhadas. |

Invariantes importantes:

- `duo_members` exige unique por usuario e por dupla, mais funcao transacional para impedir terceiro membro.
- `game_status` exige no maximo um Principal e no maximo tres jogos em Jogando por dupla.
- Ledger, eventos e historicos usam idempotency keys unicas.
- Tabelas de dominio com `duo_id` recebem RLS e testes de isolamento.
- Funcoes `security definer` definem `search_path` seguro e privilegios minimos.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k duplas | Monolito Next.js, Postgres, queries diretas e cron runner sao suficientes. |
| 1k-100k duplas | Otimizar indexes, read models, catalog sync incremental, filas de jobs e observabilidade. |
| 100k+ duplas | Separar workers pesados, revisar contratos RAWG, materializar stats e avaliar servicos duraveis. |

### Scaling Priorities

1. **First bottleneck:** Queries de catalogo, descoberta e stats; resolver com indexes, paginacao e read models.
2. **Second bottleneck:** Jobs e notificacoes; resolver com batches, locks, retries e worker dedicado.
3. **Third bottleneck:** Limites/licenca de catalogo externo; negociar plano e reduzir sincronizacao desnecessaria.

## Anti-Patterns

### Anti-Pattern 1: Cliente Calcula Premios

**What people do:** O cliente soma XP depois de uma animacao ou confirmacao.
**Why it's wrong:** Recarregamentos, requests repetidas e fraude geram divergencia.
**Do this instead:** Calcular e registrar premio em transacao idempotente no servidor.

### Anti-Pattern 2: Constraint De Dupla Apenas Na UI

**What people do:** Esconder o botao de convite depois do segundo membro.
**Why it's wrong:** Requests concorrentes ainda podem criar terceiro membro.
**Do this instead:** Bloquear e validar dentro da transacao no banco.

### Anti-Pattern 3: Cron Contem Toda A Logica

**What people do:** Um endpoint cron executa sincronizacao, streaks, quests e push em uma unica chamada.
**Why it's wrong:** Falhas parciais sao dificeis de repetir e Vercel Cron nao tenta novamente.
**Do this instead:** Cron apenas acorda um runner de jobs persistidos e idempotentes.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| RAWG | Job server-only, cache local permitido pelos termos e links de atribuicao | API key nunca vai para o cliente; nao redistribuir dados. |
| Resend | Better Auth callbacks chamam templates React Email | Separar emails de auth dos pushes de produto. |
| Web Push | Opt-in por gesto do usuario e subscriptions persistidas | Permissao nao deve ser pedida no primeiro acesso. |
| Vercel Cron | GET protegido por `CRON_SECRET` chama job runner | Timezone do cron e UTC e falhas nao recebem retry automatico. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI <-> domain | Server Action ou Route Handler | UI nao conhece secrets nem aplica regras autoritativas. |
| Domain <-> database | Drizzle + SQL explicito | Toda operacao critica ocorre em transacao. |
| Domain <-> gamification | Evento transacional | Evita acoplamento de todas as regras em uma funcao gigante. |
| Jobs <-> integrations | Adapters server-only | Facilita testes, retries e troca de fornecedor. |

## Sources

- https://nextjs.org/docs/app - arquitetura App Router e Route Handlers.
- https://better-auth.com/docs/integrations/next - handler Better Auth em Next.js.
- https://better-auth.com/docs/adapters/postgresql - suporte PostgreSQL.
- https://orm.drizzle.team/docs/connect-neon - Drizzle com Neon.
- https://neon.com/docs/guides/row-level-security - RLS em Neon.
- https://www.postgresql.org/docs/current/ddl-rowsecurity.html - semantica de RLS.
- https://www.postgresql.org/docs/current/sql-createfunction.html - seguranca de `SECURITY DEFINER`.
- https://www.postgresql.org/docs/current/explicit-locking.html - locks transacionais e advisory locks.
- https://vercel.com/docs/cron-jobs/manage-cron-jobs - seguranca, UTC e ausencia de retry.

---
*Architecture research for: QUEUE/2*
*Researched: 2026-06-03*
