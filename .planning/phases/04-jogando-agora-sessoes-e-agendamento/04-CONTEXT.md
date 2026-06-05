# Phase 4: Jogando Agora, Sessoes E Agendamento - Context

**Gathered:** 2026-06-05T08:08:48.6745379-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase turns a chosen queued game into real cooperative play for the duo. It delivers the `Jogando Agora` dashboard surface, one Principal game plus up to two secondary games, play sessions, quick offline session logging, progress tracking, timeline events, Momentos with spoiler handling, double confirmation for `Zerado`/`Dropado`, scheduled sessions, push-backed reminders, and an in-app Central da Dupla for actionable notifications.

The phase owns the `play` domain and the play-facing integration with existing Library, Dashboard, Game Detail, Push and Duo settings surfaces. It does not redesign `/app/dupla` into a full identity/stats page, does not implement deep gamification/quests/streaks from Phase 5, does not implement roulette/economy from Phase 6, and does not implement Hall/reviews/history replay from Phase 7.

</domain>

<decisions>
## Implementation Decisions

### Jogando Agora

- **D-01:** If the duo has no Principal game, the first game moved into `Jogando` becomes Principal automatically.
- **D-02:** Additional games moved into `Jogando` enter as secondary games. The duo may have at most one Principal and up to two secondaries.
- **D-03:** Any member may promote a secondary game to Principal. Promotion demotes the old Principal and must never create more than one Principal.
- **D-04:** The dashboard opens with a `Jogando Agora` hero for the Principal game using high-resolution cover, blur and gradient treatment. Secondary games appear compactly and do not compete with the hero.
- **D-05:** Mobile shows the Principal as the first block and secondaries as compact rows/cards. Desktop may use denser composition, but Principal remains the first visual signal.
- **D-06:** Reordering uses an explicit organization mode with drag-and-drop plus accessible up/down controls. The first position is Principal; the remaining positions are secondary order.
- **D-07:** When the duo tries to activate a fourth `Jogando` game, the server preserves the limit of three. The UI asks the member to pause/replace one current active game or cancel. No game is paused automatically.

### Sessoes

- **D-08:** The duo may have exactly one live play session active at a time. A live session can belong to any current `Jogando` game.
- **D-09:** If a live session is already active, starting another session routes the duo to resume or end the active session first.
- **D-10:** The live timer is based on server timestamps, not browser-local elapsed state. It must stay accurate after refresh and appear shared to both members.
- **D-11:** Ending a live session creates pending confirmations for both members. Duration and timeline effects become authoritative only after both confirm.
- **D-12:** The 30 XP live-session bonus is awarded once, only after both members confirm the completed session.
- **D-13:** `Jogamos Hoje` is a quick offline-session path using duration presets such as `30 min`, `1h`, `2h` and `Mais`. It should be reachable from dashboard/game detail in roughly two clicks.
- **D-14:** Offline session logs also remain pending until partner confirmation before definitive progress or XP effects apply.

### Progresso e Timeline

- **D-15:** Progress is shown through three independent layers: accumulated coop time compared with sourced `tempo estimado`, manual chapters, and subjective completion percentage.
- **D-16:** None of the progress layers automatically completes the game by itself. Completion still uses the `Zerado` double-confirmation flow.
- **D-17:** Coop time must preserve the existing source/freshness model for estimated completion time. If no reliable estimate exists, the UI says so honestly.
- **D-18:** Any member may create and complete manual chapters for the duo. Completion records authorship/audit facts.
- **D-19:** Each completed manual chapter grants 25 XP once. Toggling complete/incomplete must not allow repeat XP farming.
- **D-20:** Automatic timeline markers include first session, night session, marathon, 50% and 100% of estimated time when a sourced estimate exists, plus contextual reminders such as `Voces tao viciados` and `Pausar?`.
- **D-21:** Exact milestone thresholds may be calibrated during planning, but events must be audit-friendly and must not shame the duo.
- **D-22:** Momentos are inline notes in a game's timeline and may optionally attach to a session.
- **D-23:** Spoiler Momentos are hidden in previews and timeline until each viewer explicitly reveals them. Revealing a spoiler is local to that viewer, not a global duo state change.

### Encerramento e Agenda

- **D-24:** `Zerado` and `Dropado` require double confirmation. The first member creates a request; the second confirms; only then does the status change.
- **D-25:** Before the second confirmation, a `Zerado`/`Dropado` request may be cancelled without moving the game out of the active queue.
- **D-26:** After double confirmation, `Zerado`/`Dropado` games leave the operational queue and belong to the archive behavior prepared in Phase 03.2.
- **D-27:** A scheduled session belongs to a `Jogando` game and uses the duo timezone.
- **D-28:** Scheduled sessions have separate attendance confirmations for both members. Changing game/date/time resets confirmations.
- **D-29:** The 100 XP scheduled-session bonus is awarded once, only when both members confirm attendance under the scheduled-session rules.
- **D-30:** The product promise is a reminder 30 minutes before a scheduled session, but planning must treat this as an operational gate. Jobs should persist the exact due time; the runner must be frequent/precise enough before the UI promises exact reminders.
- **D-31:** If the current Vercel environment cannot support precise reminder execution, the plan must either block the promise, require an environment/plan adjustment, or clearly present the reminder as not guaranteed. The UI must not lie about reminder reliability.
- **D-32:** Push permission is requested only after an action that explains its value, such as scheduling or confirming a session. It is not requested on initial app load.
- **D-33:** Users must be able to disable product push notifications. Disabling push cannot break scheduled sessions, confirmations or in-app notifications.

### Central de Notificacoes da Dupla

- **D-34:** Phase 4 includes a Central da Dupla for synchronized in-app notifications. `Tempo real` means duo notifications and pending actions updating inside the app, not social feed, chat or comments.
- **D-35:** The central shows unread badge state, actionable pending items, and recent operational events: pending confirmations, scheduled sessions, reminder sent, live session in progress, `Zerado`/`Dropado` requests, push failures and disabled-permission notices.
- **D-36:** Initial real-time behavior should use short revalidation/polling, refresh on tab focus, and Web Push for out-of-tab alerts when allowed.
- **D-37:** WebSocket or SSE is not required for Phase 4. If polling fails to deliver the needed live feeling, planning may evaluate SSE/WebSocket behind the same notification contract without changing product scope.
- **D-38:** The central is limited to notifications and pending actions generated by Phase 4 capabilities. It does not include chat, mentions, comments, infinite history, competitive notices or advanced notification preference matrices.

### Tela da Dupla

- **D-39:** Phase 4 touches `/app/dupla` only where needed for sessions, scheduling and notifications.
- **D-40:** Allowed `/app/dupla` scope in Phase 4: duo timezone, notification/push preferences, permission state, opt-out, and links or blocks for relevant Central da Dupla pending items.
- **D-41:** Phase 4 must not redesign `/app/dupla` into a full identity, vibe, history, shared profile, emotional presentation or broad stats page.
- **D-42:** A dedicated Phase 4.1 is the recommended place to evolve `/app/dupla` into a stronger duo identity/configuration surface.

### the agent's Discretion

- Choose exact table names, route names, component decomposition, status labels, copy variants, polling intervals, mobile/desktop layout breakpoints, drag-and-drop implementation details, and milestone thresholds as long as the decisions above hold.
- Choose the technical runner strategy for due scheduled-session jobs, but do not weaken the product truthfulness around reminder precision.
- Choose whether the Central da Dupla lives in the app shell as a popover/sheet or a small route-backed surface, provided it stays actionable, accessible and not a social feed.
- Choose exact optimistic/pending feedback mechanics, but server state remains authoritative for confirmations, XP, progress and status transitions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and phase scope

- `.planning/ROADMAP.md` - Phase 4 goal, dependencies, mapped requirements and success criteria.
- `.planning/REQUIREMENTS.md` - PLAY-01 through PLAY-04, PLAY-06 through PLAY-13, SESS-01 through SESS-14, SAFE-01, SAFE-02 and SAFE-04.
- `.planning/PROJECT.md` - Core ritual, `/2` duo-only product model, Playing Now system, Deep Gamification boundaries, screens, scheduled work and source/freshness constraints.
- `AGENTS.md` - Repository operating rules, GSD workflow requirement, frontend quality bar, architecture/security pointers and project constraints.

### Binding contracts

- `.planning/ARCHITECTURE.md` - Modular monolith boundaries, public module entrypoints, dependency direction, database ownership and rule that business logic does not live in routes/UI.
- `.planning/SECURITY.md` - Server authorization, RLS, forced duo isolation, double-confirmation/concurrency invariants, idempotency, jobs, push and every-phase gates.
- `.planning/research/STACK.md` - Next.js App Router, Neon Postgres, Drizzle, Vercel Cron, SWR/revalidation, `web-push`, dnd-kit, Motion, Vitest and Playwright stack guidance.

### Prior decisions

- `.planning/phases/02-catalogo-e-biblioteca/02-CONTEXT.md` - Original Library/Game Detail decisions, `Jogando` limit, placeholder journey surface and deferred double-confirmation behavior.
- `.planning/phases/03-descoberta-e-matches/03-CONTEXT.md` - Discovery handoff to `Wishlist`, `Jogando` and `Pausado`, match history boundary, future Playing Now boundary and push opt-in precedent.
- `.planning/phases/03.2-biblioteca-escalavel-e-backlog-operacional/03.2-CONTEXT.md` - Operational Biblioteca, archive boundary, `Jogando` special area and explicit Phase 4 ownership of Principal/secondary, sessions and terminal confirmations.
- `.planning/phases/03.3-performance-de-producao-e-ux-de-latencia/03.3-CONTEXT.md` - Production latency and mutation feedback gate before adding more write-heavy Phase 4 flows.

### External operational reference

- `https://vercel.com/docs/cron-jobs/usage-and-pricing` - Current Vercel Cron limits. Hobby cron jobs are daily with imprecise invocation; precise 30-minute reminders need an appropriate runner/environment before the product can promise exact timing.

### Current code integration points

- `apps/web/src/app/app/page.tsx` - Current dashboard that should become the `Jogando Agora` entry surface.
- `apps/web/src/app/app/jogo/[slug]/page.tsx` - Game detail placeholder for `Jornada da dupla`, sessions, progress and milestones.
- `apps/web/src/app/app/dupla/page.tsx` - Duo settings surface that Phase 4 may touch only for timezone/notification operational scope.
- `apps/web/src/components/app-shell.tsx` - Authenticated shell and mobile bottom navigation; likely home for notification badge/central entry.
- `apps/web/src/modules/library/domain/library-policy.ts` - Status rules, active statuses, `JOGANDO_LIMIT` and existing `Zerado`/`Dropado` future-confirmation contract.
- `apps/web/src/modules/library/application/ports.ts` - Library record contracts that must grow or be coordinated with play read models.
- `apps/web/src/modules/library/application/move-library-game.ts` - Existing status-move use case that Phase 4 must extend or route around for double confirmation.
- `apps/web/src/modules/library/infrastructure/library-repository.ts` - Current repository enforcing active queue reads and library status mutation.
- `apps/web/src/modules/discovery/application/register-push-subscription.ts` - Existing push subscription validation and disable flow to reuse/generalize.
- `apps/web/src/modules/discovery/infrastructure/push-service.ts` - Existing server-only `web-push` adapter and VAPID boundary.
- `packages/db/src/schema/app.ts` - Current app schema with `duo_library_games`, `discovery_live_sessions` and `discovery_push_subscriptions`; Phase 4 adds play/session/schedule/notification state here.
- `packages/db/src/rls/policies.sql` - Current duo-scoped RLS policy patterns to extend for new play and notification tables.
- `packages/db/src/schema/catalog.ts` - Sourced completion-time and availability data used by progress/time estimates.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `library-policy.ts` already has `JOGANDO_LIMIT`, active statuses, archive statuses and future-confirmation status names. Phase 4 should convert those future blocks into real confirmation flows instead of inventing parallel status names.
- `library-repository.ts` already reads `playing` and `nextQueue` slices for Biblioteca. Phase 4 can reuse the active-queue shape but needs Principal/secondary ordering and play read models.
- `/app/jogo/[slug]` already renders catalog facts, source/freshness and a `Jornada da dupla` placeholder. This is the natural place to add sessions, progress, Momentos and milestones.
- Existing Discovery push code validates browser subscriptions, stores endpoint/key material per user and keeps VAPID private material server-only. Phase 4 should generalize or reuse this boundary for session reminders and notification preferences.
- `AppShell` already owns authenticated navigation and mobile bottom nav. A notification badge/central entry should integrate there rather than creating a disconnected navigation pattern.
- Existing performance instrumentation on `/app` and `/app/jogo/[slug]` should be preserved as these routes become heavier.

### Established Patterns

- Authenticated routes require verified sessions and redirect users without a ready duo.
- Routes compose module public APIs; domain rules live in domain/application modules; infrastructure owns database access.
- Duo-scoped data uses server authorization plus forced RLS. New play/session/schedule/notification tables need the same treatment.
- Mutation UX can be immediate, but optimistic UI must not award XP, create progress, confirm a partner action or bypass server authority.
- RAWG/source/freshness transparency is already established for catalog facts and must remain visible when progress compares against estimated completion time.
- Missing fixtures or missing operational evidence are recorded as blockers, not passing evidence.

### Integration Points

- Add a `play` module under `apps/web/src/modules/play` with public entrypoints for current play state, ordering, sessions, progress, Momentos, scheduling, notifications and terminal confirmations.
- Extend `packages/db` with Phase 4 tables for play ordering, play sessions, session confirmations, chapters/checkpoints, inline notes, scheduled sessions, notification items and due jobs/outbox as needed.
- Extend RLS, constraints and concurrency tests so one Principal, at most three `Jogando`, one confirmation per member, one XP award per effect and cross-duo isolation are database-backed.
- Update `/app` to make `Jogando Agora` the first authenticated dashboard signal.
- Update `/app/jogo/[slug]` to replace placeholder journey copy with session/progress/timeline UI.
- Update `/app/biblioteca` and library status controls so `Zerado`/`Dropado` open real double-confirmation flows rather than future-state blockers.
- Update `/app/dupla` only for timezone and notification/push preference surfaces needed by Phase 4.
- Add browser and integration tests for desktop/mobile/reduced-motion, live session refresh, double confirmation, notification badge state, push opt-in timing, and cross-duo isolation.

</code_context>

<specifics>
## Specific Ideas

- The Principal game should feel like the duo's current commitment, not just one card among many.
- `Jogamos Hoje` should be a fast ritual, not a form that makes the duo do admin work after playing.
- The timeline should celebrate and orient without becoming Hall da Moral yet.
- The in-app Central da Dupla should feel alive through duo notifications and pending actions, while staying operational and restrained.
- The `/app/dupla` screen needs a larger evolution, but that should become a focused Phase 4.1 rather than being hidden inside Phase 4.

</specifics>

<deferred>
## Deferred Ideas

- **Phase 4.1 proposal:** evolve `/app/dupla` into a stronger duo identity/configuration surface with shared presence, emotional presentation, richer settings and possible preparation for stats, without mixing that redesign into the main sessions/progress scope.
- Deep XP economy, 50 levels, quests, achievements and streaks belong to Phase 5.
- Roulette/case opening, pity, boost and result locking belong to Phase 6.
- Hall da Moral, reviews, shelf, replay timeline and broad duo stats belong to Phase 7.
- Chat, comments, mentions and social feed behavior remain out of scope.

</deferred>

---

*Phase: 4-Jogando Agora, Sessoes E Agendamento*
*Context gathered: 2026-06-05T08:08:48.6745379-03:00*
