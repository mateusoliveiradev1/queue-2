---
phase: 03-descoberta-e-matches
reviewed: 2026-06-04T16:38:18Z
depth: standard
files_reviewed: 56
files_reviewed_list:
  - .env.example
  - apps/web/package.json
  - apps/web/public/discovery-push-sw.js
  - apps/web/src/app/api/discovery/live/[sessionId]/route.ts
  - apps/web/src/app/api/discovery/push/route.ts
  - apps/web/src/app/api/discovery/search/route.ts
  - apps/web/src/app/app/descobrir/actions.ts
  - apps/web/src/app/app/descobrir/loading.tsx
  - apps/web/src/app/app/descobrir/page.tsx
  - apps/web/src/app/app/page.tsx
  - apps/web/src/app/globals.css
  - apps/web/src/components/app-shell.tsx
  - apps/web/src/modules/discovery/application/answer-mood-quiz.ts
  - apps/web/src/modules/discovery/application/get-discovery-deck.ts
  - apps/web/src/modules/discovery/application/get-live-session.ts
  - apps/web/src/modules/discovery/application/get-match-history.ts
  - apps/web/src/modules/discovery/application/get-surprise-recommendation.ts
  - apps/web/src/modules/discovery/application/ports.ts
  - apps/web/src/modules/discovery/application/record-discovery-decision.ts
  - apps/web/src/modules/discovery/application/register-push-subscription.ts
  - apps/web/src/modules/discovery/application/search-discovery-games.ts
  - apps/web/src/modules/discovery/application/send-match-notification.ts
  - apps/web/src/modules/discovery/application/start-live-session.ts
  - apps/web/src/modules/discovery/domain/discovery-policy.ts
  - apps/web/src/modules/discovery/domain/mood-quiz.ts
  - apps/web/src/modules/discovery/domain/recommendation-policy.ts
  - apps/web/src/modules/discovery/index.ts
  - apps/web/src/modules/discovery/infrastructure/discovery-repository.ts
  - apps/web/src/modules/discovery/infrastructure/push-service.ts
  - apps/web/src/modules/discovery/presentation/discovery-card.tsx
  - apps/web/src/modules/discovery/presentation/discovery-deck.tsx
  - apps/web/src/modules/discovery/presentation/discovery-filters.tsx
  - apps/web/src/modules/discovery/presentation/discovery-search.tsx
  - apps/web/src/modules/discovery/presentation/discovery-source-metadata.tsx
  - apps/web/src/modules/discovery/presentation/live-panel.tsx
  - apps/web/src/modules/discovery/presentation/live-session-refresh.tsx
  - apps/web/src/modules/discovery/presentation/match-celebration.tsx
  - apps/web/src/modules/discovery/presentation/match-history.tsx
  - apps/web/src/modules/discovery/presentation/mood-quiz.tsx
  - apps/web/src/modules/discovery/presentation/push-opt-in-button.tsx
  - apps/web/src/modules/discovery/presentation/view-models.ts
  - apps/web/src/platform/rate-limit/persistent.ts
  - apps/web/tests/accessibility.spec.ts
  - apps/web/tests/discovery-application.test.ts
  - apps/web/tests/discovery-domain.test.ts
  - apps/web/tests/discovery-push.test.ts
  - apps/web/tests/discovery-search.test.ts
  - apps/web/tests/discovery-ui.test.tsx
  - apps/web/tests/phase-3-e2e.spec.ts
  - packages/db/src/migrations/0008_discovery_core.sql
  - packages/db/src/rls/policies.sql
  - packages/db/src/roles.sql
  - packages/db/src/schema/app.ts
  - packages/db/tests/discovery-concurrency.test.ts
  - packages/db/tests/discovery-rls.test.ts
  - scripts/check-secrets.mjs
findings:
  critical: 4
  warning: 6
  info: 0
  total: 10
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-06-04T16:38:18Z
**Depth:** standard
**Files Reviewed:** 56
**Status:** issues_found

## Summary

Revisao adversarial dos arquivos de descoberta, matches, push, RLS, testes e configuracao. As tabelas discovery ativam e forcam RLS, e nao encontrei vazamento direto de `RAWG_API_KEY` ou `VAPID_PRIVATE_KEY` para componentes cliente. Ainda assim, ha bugs bloqueantes em concorrencia de match, atalhos do deck, validacao de UUID e no modo Surpresa. Tambem ha quebras de fronteira arquitetural e gaps de teste que deixam esses bugs passarem.

## Critical Issues

### CR-01: BLOCKER - Aprovacoes reciprocas simultaneas podem nao criar match

**File:** `apps/web/src/modules/discovery/infrastructure/discovery-repository.ts:216`
**Issue:** `recordDecision` grava a decisao atual e depois consulta a decisao do parceiro sem serializar por `duo_id/catalog_game_id`. Duas transacoes simultaneas de "Quero jogar" podem inserir suas decisoes, cada uma ler a decisao do parceiro antes do commit da outra e ambas retornarem sem chamar `createMatch`, deixando duas decisoes `want` sem nenhum match.
**Fix:**
```ts
await client.query(
  "SELECT pg_advisory_xact_lock(hashtextextended($1 || ':' || $2, 0))",
  [context.duoId, input.catalogGameId]
);

// Depois do lock: upsert da decisao, leitura da decisao do parceiro e createMatch.
```
Tambem e aceitavel trocar a criacao por um `INSERT ... SELECT` idempotente que so insere quando as duas linhas `want` ja existem, executado apos o upsert sob lock/retry.

### CR-02: BLOCKER - Teclado e gesto de swipe submetem a carta errada

**File:** `apps/web/src/modules/discovery/presentation/discovery-deck.tsx:48`
**Issue:** `submitDecision` chama `setActiveIndex` antes do `requestSubmit` agendado. Como os mesmos refs sao reutilizados, no callback eles ja apontam para os formularios da proxima carta. Atalhos de teclado e drag podem registrar a decisao no jogo seguinte, enquanto a carta visivel original fica sem decisao.
**Fix:**
```tsx
function submitDecision(decision: Reaction) {
  const form =
    decision === "want"
      ? wantFormRef.current
      : decision === "not_now"
        ? notNowFormRef.current
        : skipFormRef.current;

  setReaction(decision);
  form?.requestSubmit();
}
```
Se a animacao precisar ocorrer antes da navegacao, capture um formulario ou `FormData` especifico da carta ativa em vez de ler refs depois de avancar o indice.

### CR-03: BLOCKER - Parametros UUID vindos do cliente conseguem derrubar a pagina/actions

**File:** `apps/web/src/app/app/descobrir/page.tsx:58`
**Issue:** `live` vem direto da query string e e repassado para `getLiveSession`; o repositorio faz `$2::uuid` em `discovery-repository.ts:698`. Uma URL como `/app/descobrir?live=abc` causa erro de cast no Postgres e 500. O mesmo padrao existe nas server actions: `catalogGameId` so e checado como string nao vazia em `actions.ts:18` e `actions.ts:49`, mas chega a consultas contra colunas uuid (`discovery-repository.ts:1056`, `discovery-repository.ts:1145`).
**Fix:**
```ts
const uuidSchema = z.string().uuid();
const liveId = uuidSchema.safeParse(getSearchParam(params?.live));

if (params?.live && !liveId.success) {
  redirect("/app/descobrir?estado=acao-invalida");
}
```
Aplicar a mesma validacao de UUID nas actions antes de chamar qualquer caso de uso que consulte `catalog_game_id`.

### CR-04: BLOCKER - O modo Surpresa calcula recomendacao mas nunca mostra a carta

**File:** `apps/web/src/app/app/descobrir/actions.ts:131`
**Issue:** `getSurpriseRecommendationAction` redireciona com `surpresa=<catalogGameId>`, mas `DiscoveryPage` nunca le esse parametro para buscar/prepender/renderizar a carta. A pagina apenas preserva `surpresa` em `buildDiscoveryPath` (`page.tsx:272-299`) e exibe um status. Resultado: clicar "Surpresa" pode dizer que a surpresa esta pronta sem entregar a carta recomendada.
**Fix:** fazer a pagina consumir `surpresa` com validacao de UUID e renderizar a carta correspondente, por exemplo via `getDiscoveryDeck({ preferredCatalogGameId })` ou um `getDiscoveryCardById` que retorne a carta no mesmo formato do deck. O E2E deve verificar o titulo da carta surpresa, nao apenas o toast.

## Warnings

### WR-01: WARNING - Redirects de Live/Surpresa corrompem query strings existentes

**File:** `apps/web/src/app/app/descobrir/actions.ts:83`
**Issue:** `withState(`${returnTo}?live=...`)` e `withState(`${returnTo}?surpresa=...`)` concatenam `?` manualmente. Quando `returnTo` ja contem filtros ou uma live anterior, o novo parametro vira parte codificada de outro parametro ou produz um `live` invalido.
**Fix:**
```ts
function withParam(path: string, key: string, value: string): string {
  const url = new URL(path, "https://queue.local");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

redirect(withState(withParam(returnTo, "live", result.session.id), "live-iniciado"));
```

### WR-02: WARNING - Decisoes feitas fora do deck sao persistidas como `deck`

**File:** `apps/web/src/modules/discovery/presentation/discovery-card.tsx:174`
**Issue:** `DiscoveryCard` hardcodeia `<input name="sourceMode" value="deck" />`. A busca reutiliza o mesmo componente em `discovery-search.tsx:139`, entao decisoes feitas em autocomplete entram no banco e em `created_from` como se fossem do deck. Isso quebra historico, auditoria de modos e qualquer regra futura por origem.
**Fix:** adicionar prop `sourceMode: DiscoverySourceMode` ao `DiscoveryCard` e passar `deck`, `search`, `surprise`, `quiz` ou `live` conforme o contexto que renderiza a carta.

### WR-03: WARNING - Fronteiras arquiteturais do modulo discovery estao invertidas

**File:** `apps/web/src/app/app/descobrir/page.tsx:13`
**Issue:** a rota importa `modules/discovery/presentation/*` diretamente, embora o contrato diga `app composition -> module public entrypoint`. Alem disso, use cases em `application` importam `../presentation/view-models` (`get-discovery-deck.ts:7`, `search-discovery-games.ts:1`, `get-surprise-recommendation.ts:1`), invertendo a dependencia esperada `presentation -> application -> domain`.
**Fix:** exportar os componentes publicos pelo `modules/discovery/index.ts` ou por um entrypoint publico explicitamente suportado, mover os mapeadores usados pelos use cases para `application`/`domain` ou um mapper sem dependencia de presentation, e ampliar `scripts/check-architecture.mjs` para bloquear app deep-imports e inversao de camada dentro do mesmo modulo.

### WR-04: WARNING - Handoff para biblioteca nao e atomico com o status do match

**File:** `apps/web/src/modules/discovery/application/record-discovery-decision.ts:72`
**Issue:** `handoffDiscoveryMatchToLibraryUseCase` primeiro muda a biblioteca via modulo `library` e so depois chama `markMatchLibraryHandoff` (`record-discovery-decision.ts:85`). Essas operacoes rodam em transacoes separadas. Se a segunda falhar depois da biblioteca ser atualizada, o jogo entra/move na biblioteca, mas o match continua sem `library_handoff_status`.
**Fix:** tornar o handoff idempotente e transacional por contrato publico: usar uma unidade de trabalho que atualize biblioteca e match na mesma transacao, ou registrar um estado/outbox pendente antes da mutacao e finalizar/reconciliar com idempotency key.

### WR-05: WARNING - Opt-in de push pode ficar preso em estado de carregamento

**File:** `apps/web/src/modules/discovery/presentation/push-opt-in-button.tsx:31`
**Issue:** `handleEnablePush` nao envolve `fetch`, `response.json()`, registro do service worker, `subscribe` ou conversao da chave VAPID em `try/catch`. Qualquer falha de rede, JSON invalido ou chave publica malformada gera rejection nao tratada e deixa a UI em `enabling`.
**Fix:**
```tsx
async function handleEnablePush() {
  try {
    setState("enabling");
    // fetch config, request permission, register SW, subscribe, POST
  } catch {
    setState("failed");
  }
}
```
Aplicar o mesmo tratamento ao fluxo de disable para manter estado recuperavel.

### WR-06: WARNING - Teste de concorrencia nao cobre a logica de producao

**File:** `packages/db/tests/discovery-concurrency.test.ts:93`
**Issue:** o teste "concurrent reciprocal approvals create one discovery match" chama `approveAndCreateMatch`, que insere a decisao e depois faz `INSERT INTO app.discovery_matches` diretamente no proprio teste (`discovery-concurrency.test.ts:126`). Ele nunca chama `recordDiscoveryDecision`, `createDiscoveryRepository` ou a sequencia real que le a decisao do parceiro, entao nao detecta o bug de corrida descrito em CR-01.
**Fix:** adicionar um teste de integracao usando o repositorio/caso de uso real com duas chamadas concorrentes de `recordDecision`/`recordDiscoveryDecision`, idealmente com barreira controlada entre upsert e leitura do parceiro para reproduzir a interleaving de corrida.

---

_Reviewed: 2026-06-04T16:38:18Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
