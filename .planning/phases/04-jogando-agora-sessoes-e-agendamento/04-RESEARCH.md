# Phase 04 Research: Jogando Agora, Sessoes E Agendamento

**Phase:** 04 - Jogando Agora, Sessoes E Agendamento
**Generated:** 2026-06-05
**Mode:** inline research, selected by user during `$gsd-plan-phase 4`

## RESEARCH COMPLETE

## Executive Summary

Phase 4 is the first phase where QUEUE/2 stops being only backlog/discovery and becomes operational play. The implementation should introduce a `play` module with its own domain/application/infrastructure/presentation boundary, backed by new duo-scoped tables and database constraints for Principal/secondary ordering, live sessions, double confirmations, progress, timeline, Momentos, scheduled sessions and notifications.

The hardest part is not the UI. It is preserving the `/2` promise under concurrency: one Principal, at most three `Jogando`, exactly one active live session, one confirmation per member, one XP award per effect, no cross-duo reads/writes, and idempotent scheduled work. PostgreSQL should enforce the practical invariants through constraints, partial unique indexes, locks and RLS; application code should expose use cases instead of putting business rules in routes or components.

The reminder promise has an operational caveat. Vercel Cron currently supports per-minute execution for non-Hobby teams, but Hobby cron jobs are daily and may run anywhere in the target hour. The plan must not promise an exact 30-minute reminder unless production uses a suitable Vercel plan or equivalent runner. The implementation should persist due jobs with idempotency and show honest UI copy when reminder precision is not configured.

## Scope Findings

- `04-CONTEXT.md` includes 42 trackable decisions. The plans must explicitly carry all D-IDs, especially the less visible ones: notification center, `/app/dupla` limited scope, reminder precision truthfulness and local spoiler reveal state.
- Mapped requirements are `PLAY-01` through `PLAY-04`, `PLAY-06` through `PLAY-13`, `SESS-01` through `SESS-14`, and `SAFE-01`, `SAFE-02`, `SAFE-04`.
- Phase 4 depends on Phase 03.3, so all new hot paths need timing, local feedback, bounded reads and no accidental full-route refresh regression.
- Phase 5 owns deep gamification, but Phase 4 still must award 25/30/100 XP once for chapters/live/scheduled sessions. That needs a minimal auditable ledger or award table now, even if levels/quests/achievements remain deferred.

## Current Codebase Patterns

### Reusable module and route patterns

- Authenticated pages use `requireVerifiedSession()` and redirect users without a ready duo.
- Mutations use `requireAuthoritativeVerifiedSession()`, validate form input, call module public APIs, revalidate affected routes and redirect or return enhanced mutation states.
- Route and Server Action timing uses `withServerTiming` and `measureStage`, with stable labels such as `auth`, `database`, `render` and `revalidation`.
- `AppShell` owns authenticated navigation and is the natural place for Central da Dupla badge/entry.
- `/app` is still a readiness/status dashboard; Phase 4 should make `Jogando Agora` the first signal there.
- `/app/jogo/[slug]` already has catalog facts and a `Jornada da dupla` placeholder. It is the right detail surface for sessions, progress, timeline and Momentos.
- `/app/dupla` already owns timezone and preferences. Phase 4 should add only notification/push operational settings and pending-item links there.

### Existing domain/database assets

- `library-policy.ts` already defines `JOGANDO_LIMIT = 3`, active statuses and future confirmation statuses for `zerado/dropado`.
- `move-library-game.ts` currently returns `future-confirmation-required` for terminal statuses. Phase 4 should replace that placeholder with real terminal confirmation use cases, not expose direct terminal moves.
- Migration `0005_library_duo_state.sql` enforces the three-game `Jogando` limit with a trigger that locks the duo row. Principal/secondary ordering should build on this rather than duplicate the status limit elsewhere.
- `ops.domain_events` and `ops.idempotency_keys` already exist and are RLS-protected. They are suitable foundations for audit and idempotency, but there is no XP ledger yet.
- Discovery push code already validates endpoint/key material, stores subscriptions server-side and uses `web-push` with VAPID secrets. Phase 4 can generalize this shape for product push without leaking secrets.
- Catalog source/freshness and estimated time models already exist. Progress comparison must preserve those facts and explicitly say when no reliable estimate exists.

## Recommended Architecture

Add `apps/web/src/modules/play` with:

- `domain/` for pure policies:
  - active queue ordering and promotion
  - live/offline/scheduled session state transitions
  - double-confirmation rules
  - XP award idempotency keys
  - milestone classification
  - spoiler visibility rules
  - notification item taxonomy
- `application/` for use cases:
  - get current play dashboard
  - activate/promote/reorder playing games
  - start/end/confirm live session
  - log/confirm offline session
  - update progress percentage and chapters
  - create/reveal Momentos
  - request/confirm/cancel terminal status
  - schedule/update/cancel/confirm scheduled session
  - register/disable product push subscription
  - run due reminder jobs
  - get notification center payload
- `infrastructure/` for Postgres queries, locks, RLS-friendly transactions, web-push adapter and cron/job repository.
- `presentation/` for view models and small client components such as timer display, reorder controls, spoiler reveal and notification center UI.
- `index.ts` as the only public entrypoint.

Routes should only compose play use cases:

- `/app` renders the `Jogando Agora` dashboard.
- `/app/jogo/[slug]` renders the play detail/timeline for a library game.
- `/app/dupla` renders operational timezone/push preferences and pending notification links.
- `/api/jobs/play/reminders` runs due reminder work.
- Optional polling route or route handler only if Server Components + SWR cannot provide the notification/live feel cleanly.

## Database Model Guidance

Suggested tables or equivalent shapes:

- `app.play_active_games`
  - `duo_id`, `library_game_id`, `role` (`principal` or `secondary`), `position`, audit columns.
  - Partial unique index for one principal per duo.
  - Unique `(duo_id, position)` for deterministic order.
  - FK to `duo_library_games`; application transaction keeps status `jogando`.
- `app.play_sessions`
  - `duo_id`, `library_game_id`, `kind` (`live` or `offline`), `status`, `started_at`, `ended_at`, `duration_seconds`, `created_by_user_id`.
  - Partial unique index for one active live session per duo.
- `app.play_session_confirmations`
  - one row per session/user, unique `(session_id, user_id)`.
- `app.play_progress`
  - per library game accumulated confirmed seconds, subjective percent, updated audit data.
- `app.play_chapters`
  - manual chapter rows with completion audit fields and idempotent XP award reference.
- `app.play_momentos`
  - inline notes, optional session FK, `is_spoiler`, author/audit fields.
- `app.play_spoiler_reveals`
  - local viewer reveal state, unique `(momento_id, user_id)`.
- `app.play_terminal_requests`
  - status target `zerado/dropado`, requester, cancel/confirmed timestamps.
- `app.play_scheduled_sessions`
  - game, scheduled start in UTC, duo timezone snapshot, status, reminder due timestamp, update audit fields.
- `app.play_scheduled_attendance`
  - unique `(scheduled_session_id, user_id)` confirmation rows.
- `app.play_notifications`
  - synchronized in-app notification center items with unread/read/action state.
- `app.push_subscriptions` or generalized discovery subscriptions
  - product push subscription rows per user/browser, enabled/disabled state.
- `ops.scheduled_jobs` or play-specific reminder queue
  - due work with job key, status, attempts, last error, locked/processed timestamps.
- `app.duo_xp_awards` or `app.play_xp_awards`
  - minimal audit ledger for Phase 4 XP effects, unique award key, amount, source type/id, awarded after both confirmations.

Every duo-scoped table needs forced RLS. New migrations should also update `packages/db/src/schema/app.ts`, `packages/db/src/schema/ops.ts` where relevant, `packages/db/src/rls/policies.sql`, grants and integration tests.

## Concurrency And Idempotency Risks

| Risk | Planning implication |
|------|----------------------|
| Fourth `Jogando` game | Preserve existing database trigger and surface a replace/pause/cancel UI. Never auto-pause. |
| Two Principal promotions at once | Lock duo/active rows and enforce one principal by partial unique index. |
| Two live sessions | Partial unique index for active live session plus application resume/end branch. |
| Replayed session confirmation | Unique confirmation rows and idempotent award keys. |
| XP duplication | Unique award key per effect, append audit, update `duos.xp` in same transaction. |
| Terminal status race | One active terminal request per library game; partner confirmation changes status once. |
| Schedule edit after attendance confirmations | Editing game/date/time resets attendance and reminder job in one transaction. |
| Job duplicate delivery | Job rows, locks and idempotency keys; Vercel docs explicitly warn duplicate cron delivery can happen. |
| Cross-duo access | Server authorization plus RLS tests for every new table and mutation. |

## UI And UX Guidance

- Principal should be the first visual signal on mobile and desktop. Treat it as the current commitment, not a generic card.
- Reorder should use an explicit organization mode. Use `@dnd-kit` when installed during implementation, plus up/down controls for keyboard and touch accessibility.
- The live timer should display server-derived elapsed time. Client interval is presentation only.
- `Jogamos Hoje` should be a compact fast path with duration presets and minimal optional detail.
- Progress should show three independent layers: confirmed coop time vs sourced estimate, manual chapters and subjective percent. No layer completes the game automatically.
- Timeline should combine sessions, chapters, milestones and Momentos without becoming Phase 7 Hall/replay.
- Spoiler reveal is local to the viewer. Do not mutate the Momento itself when someone reveals it.
- Central da Dupla should be operational: pending confirmations, live session, scheduled sessions, reminders and push errors. It is not chat, comments or a social feed.
- `/app/dupla` changes should remain settings-oriented: timezone, push preferences, permission state, disable action and pending links.

## Operational Research

- Vercel Cron invokes HTTP GET requests to production deployment URLs for configured paths and sends cron-triggered functions as normal Vercel Function invocations. Official docs: https://vercel.com/docs/cron-jobs
- Cron endpoints should validate `Authorization: Bearer ${CRON_SECRET}`. Existing catalog refresh code already follows this pattern.
- Vercel docs updated February 27, 2026 state that Hobby cron jobs run only once per day and may invoke anytime within the specified hour; all other teams are invoked within the specified minute. Official docs: https://vercel.com/docs/cron-jobs/manage-cron-jobs
- Vercel docs also state failed cron invocations are not retried, overlapping runs can happen, and duplicate delivery can occasionally occur. This reinforces database locks and idempotent job processing.
- MDN Push API documents browser push through service workers and PushManager subscriptions, and Notifications API guidance discourages permission prompts without user consent/gesture. Official docs: https://developer.mozilla.org/en-US/docs/Web/API/Push_API and https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API

## Plan Shape Recommendation

Use six plans:

1. Data/domain foundation for play state, RLS, constraints, XP awards, jobs and module skeleton.
2. `Jogando Agora` dashboard, Principal/secondary ordering, replacement flow and accessible reorder.
3. Live/offline sessions, double confirmation, progress, chapters and XP effects.
4. Game timeline, milestones, Momentos and spoiler reveal.
5. Scheduling, attendance, push subscriptions, reminders, Central da Dupla and `/app/dupla` settings.
6. Cross-phase verification gate: phase gate command, query review, browser E2E, accessibility/security evidence and reminder precision readiness artifact.

This order lets the database and contracts land first, then UI and workflow slices build on stable invariants.

## Open Questions For Execution

- Whether to generalize `discovery_push_subscriptions` into product-wide `push_subscriptions` or create `play_push_subscriptions` and migrate later. The plan should prefer a product-wide table if implementation cost is reasonable.
- Whether `duo_xp_awards` should live in `app` or `ops`. The award is product state and duo-scoped; `app.duo_xp_awards` with domain events in `ops` is the clearer split.
- Whether reminder precision can be enabled in current deployment. If not, implementation must show "lembrete preparado, precisao pendente de ambiente" or equivalent instead of guaranteeing 30-minute delivery.

## Verification Priorities

- Unit tests for pure policies: ordering, promotion, sessions, confirmations, awards, progress, milestones, spoiler visibility and notifications.
- Integration tests for RLS, one principal, active live session uniqueness, double confirmation, one XP award, scheduled job idempotency and cross-duo write rejection.
- UI tests for mobile/desktop dashboard, reorder controls, fast session logging, spoiler reveal, notification center, push opt-in timing and reduced motion.
- E2E tests with two ready duo users and one other-duo user.
- Performance/query review for `/app`, `/app/jogo/[slug]`, notification center polling, schedule/reminder job reads and primary mutations.

