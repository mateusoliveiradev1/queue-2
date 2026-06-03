# Requirements: QUEUE/2

**Defined:** 2026-06-03
**Core Value:** A dupla vive um ritual completo e memoravel para descobrir, escolher, jogar e celebrar jogos coop junta.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can create an account with email and password
- [x] **AUTH-02**: User receives an email verification flow after signup
- [x] **AUTH-03**: User can log in with email and password
- [x] **AUTH-04**: User can reset a forgotten password through an email link
- [x] **AUTH-05**: User session persists across browser refreshes
- [x] **AUTH-06**: User can view and revoke their active sessions
- [x] **AUTH-07**: User can log out from the authenticated app

### Duo And Profile

- [x] **DUO-01**: Authenticated user without a duo can create a six-character pairing code
- [x] **DUO-02**: Authenticated user can join a duo by entering a valid six-character pairing code
- [x] **DUO-03**: A pairing code expires or can be revoked before it is used
- [x] **DUO-04**: A duo can never contain more than two members, including under concurrent pairing attempts
- [x] **DUO-05**: User can view the shared identity and pairing date of their duo
- [x] **DUO-06**: User can edit their own display name and profile settings
- [x] **DUO-07**: Duo can set a timezone used by resets, streaks and scheduled sessions
- [x] **DUO-08**: Duo can configure shared notification and audio preferences
- [x] **DUO-09**: User can only access data that belongs to their own duo
- [x] **DUO-10**: User cannot create solo play sessions or solo progress

### Brand And App Experience

- [x] **BRND-01**: User sees the QUEUE/2 wordmark with Archivo Black `QUEUE` and acid lime JetBrains Mono `/2`
- [x] **BRND-02**: User sees the `/2` brand mark in app icon, favicon and loading contexts
- [x] **BRND-03**: User sees the graphite, off-white, acid lime, violet shock and rarity color tokens consistently across the product
- [x] **BRND-04**: User sees Archivo Black for display, Inter Tight for body and JetBrains Mono for numerals and `/2`
- [x] **BRND-05**: User sees the roulette pointer motif as a recurring divider, current-game indicator or list marker
- [x] **BRND-06**: User sees a `/2` SVG stroke loading state instead of a generic spinner
- [ ] **BRND-07**: User experiences calm utility screens and heightened spectacle only for meaningful moments
- [ ] **BRND-08**: User gets the same product capabilities on mobile and desktop with an adaptive composition
- [ ] **BRND-09**: User can navigate core flows with keyboard, visible focus, readable contrast and adequate touch targets
- [ ] **BRND-10**: User with reduced-motion preference receives an equivalent low-motion experience
- [x] **BRND-11**: User sees appropriate single-line and stacked QUEUE/2 logo variants on dark and light backgrounds
- [ ] **BRND-12**: User sees global grain, sharp 4px or pill radii, and scanlines only inside the roulette experience
- [x] **BRND-13**: User receives accessible QUEUE/2-styled toast feedback for important actions, with high-impact variants reserved for matches, achievements and level-ups

### Modular Architecture

- [x] **ARCH-01**: Codebase is organized as a modular monolith with explicit modules for duo, catalog, library, discovery, play, gamification, roulette and hall
- [x] **ARCH-02**: Each domain module exposes a narrow public entrypoint and other modules cannot deep-import its internals
- [x] **ARCH-03**: Domain rules can be tested without importing Next.js, React, Drizzle, Better Auth, browser APIs or external SDKs
- [x] **ARCH-04**: Routes, Server Actions, Route Handlers and React components delegate business decisions to application use cases
- [x] **ARCH-05**: Cross-domain mutations and derived effects use the owning module's public contract or versioned domain events
- [x] **ARCH-06**: Shared packages contain reusable database, UI or configuration concerns and cannot depend on application domain modules
- [x] **ARCH-07**: Automated architecture checks fail on forbidden imports, undeclared workspace dependencies and client/server boundary leaks

### Database Integrity

- [x] **DATA-01**: Database tables are assigned to explicit `auth`, `catalog`, `app` or `ops` schema ownership
- [x] **DATA-02**: Every domain table uses primary keys, foreign keys, nullability, unique constraints and check constraints to enforce practical invariants
- [x] **DATA-03**: Every duo-scoped table has `duo_id` with default-deny RLS enabled and forced
- [x] **DATA-04**: Web runtime uses a least-privileged non-owner role without `BYPASSRLS`, separate from migrator and worker credentials
- [x] **DATA-05**: Authenticated database identity is set transaction-locally so pooled connections cannot leak authorization context
- [x] **DATA-06**: Every `SECURITY DEFINER` function uses schema-qualified references, a safe fixed `search_path` and restricted execution privileges
- [x] **DATA-07**: Concurrent requests cannot violate duo membership, Principal game, Jogando limit, confirmation or idempotency invariants
- [x] **DATA-08**: XP ledger, domain events, roulette history and audit facts are append-only in normal application flows and can rebuild derived totals
- [x] **DATA-09**: Migrations apply to an empty database and upgrade the previous schema in automated integration tests
- [x] **DATA-10**: Applied migrations remain immutable and use a direct database connection rather than a pooled transaction connection
- [x] **DATA-11**: Hot queries, foreign keys and RLS predicates have reviewed indexes, bounded reads and query-plan verification
- [x] **DATA-12**: Production has a documented restore strategy and a successful restore test before launch

### Security Assurance

- [x] **SEC-01**: Project maintains a threat model covering protected assets, trust boundaries and abuse cases
- [x] **SEC-02**: Every Server Action, Route Handler, cron endpoint and server-side mutation validates input and authorizes the current session
- [x] **SEC-03**: Proxy or middleware is never the sole authorization gate for protected data or mutations
- [x] **SEC-04**: Pairing, search, external integration and economy-sensitive endpoints use persistent abuse rate limits
- [x] **SEC-05**: Production responses use an explicit Content Security Policy, HSTS, frame protection, content-type protection and restrictive referrer policy
- [x] **SEC-06**: User-generated text is treated as untrusted and cannot execute as HTML or script
- [x] **SEC-07**: Logs and error responses redact sensitive values while preserving security-relevant audit events
- [x] **SEC-08**: Dependency, secret and static analysis checks run before deployment
- [ ] **SEC-09**: Production launch includes a recorded review of applicable OWASP ASVS 5.0 Level 2 controls
- [ ] **SEC-10**: Secret rotation, session revocation and incident-response procedures are tested before launch
- [ ] **SEC-11**: Final adversarial testing covers cross-duo IDOR, injection, replay, concurrency and privilege-escalation paths

### Catalog And Library

- [ ] **CAT-01**: Duo can browse a catalog of games synchronized from RAWG
- [ ] **CAT-02**: User sees an active RAWG attribution link on pages that use RAWG data or images
- [ ] **CAT-03**: User can view a game detail page with cover, description, genres, release information and platforms
- [ ] **CAT-04**: User can view a neutral estimated completion time with its source and freshness when available
- [ ] **CAT-05**: User can view free or Game Pass availability with its source and last verification date when available
- [ ] **CAT-06**: User can record the platforms they can use
- [ ] **CAT-07**: Duo can see which platforms both members have in common
- [ ] **LIB-01**: User can add a game to the duo Wishlist
- [ ] **LIB-02**: Duo can organize games as Wishlist, Jogando, Zerado, Dropado or Pausado
- [ ] **LIB-03**: User can view the duo library grouped or filtered by status
- [ ] **LIB-04**: User can view the duo match score for games in the library
- [ ] **LIB-05**: User can open a game from the library to view its sessions, checkpoints, progress and milestones

### Discovery

- [ ] **DISC-01**: Each duo member can swipe independently on games and the duo sees a match when both approve
- [ ] **DISC-02**: Duo can start a live match discovery session and receive a push when a match occurs
- [ ] **DISC-03**: Duo can request a surprise recommendation from games neither member has seen
- [ ] **DISC-04**: Duo can answer a three-question mood quiz to receive recommendations
- [ ] **DISC-05**: User can search for games with autocomplete
- [ ] **DISC-06**: User can filter discovery by estimated completion time
- [ ] **DISC-07**: User can filter discovery by automatically detected common platform
- [ ] **DISC-08**: User can filter discovery by coop type, mood, year, genre and rarity
- [ ] **DISC-09**: User can filter discovery by free or Game Pass availability
- [ ] **DISC-10**: Duo receives recommendations based on tag similarity before enough collaborative data exists
- [ ] **DISC-11**: Duo recommendations can incorporate collaborative filtering after enough interaction data exists
- [ ] **DISC-12**: User can move a discovered game into the duo Wishlist or another valid library status

### Playing Now And Progress

- [ ] **PLAY-01**: Duo sees a dashboard hero for the Principal game with high-resolution cover, blur and gradient treatment
- [ ] **PLAY-02**: Duo can keep up to three games in Jogando at the same time
- [ ] **PLAY-03**: Duo can designate exactly one Jogando game as Principal and up to two as secondary
- [ ] **PLAY-04**: Duo can drag to reorder the Principal and secondary games
- [ ] **PLAY-05**: Dashboard shows the duo XP, level, streak, active quests and recent achievements
- [ ] **PLAY-06**: Duo can compare accumulated coop time with the game's estimated completion time
- [ ] **PLAY-07**: Duo can create and complete manual chapters for a game
- [ ] **PLAY-08**: Duo receives 25 XP once for each completed manual chapter
- [ ] **PLAY-09**: Duo can record a subjective completion percentage for a game
- [ ] **PLAY-10**: Duo sees automatic milestones at 50% and 100% of the estimated completion time
- [ ] **PLAY-11**: Duo can receive contextual milestones such as "Voces tao viciados" and a reminder to Pausar
- [ ] **PLAY-12**: Moving a game to Zerado requires confirmation from both duo members
- [ ] **PLAY-13**: Moving a game to Dropado requires confirmation from both duo members

### Sessions, Notes And Scheduling

- [ ] **SESS-01**: Duo can start a live coop session for a Jogando game
- [ ] **SESS-02**: Live session timer is based on server timestamps and remains accurate after refresh
- [ ] **SESS-03**: Each duo member can confirm a completed live session
- [ ] **SESS-04**: Duo receives the 30 XP live-session bonus only once after both members confirm
- [ ] **SESS-05**: Duo can record an offline "Jogamos Hoje" session in approximately two clicks
- [ ] **SESS-06**: User can view a chronological session timeline on each game
- [ ] **SESS-07**: Session timeline marks a first session, night session and marathon when applicable
- [ ] **SESS-08**: Duo can add inline Momentos to a game
- [ ] **SESS-09**: User can mark an inline Momento as a spoiler
- [ ] **SESS-10**: Spoiler Momentos remain hidden until the viewer explicitly reveals them
- [ ] **SESS-11**: Duo can schedule a future coop session
- [ ] **SESS-12**: Each duo member can confirm attendance for a scheduled session
- [ ] **SESS-13**: Duo receives 100 XP only once when both members confirm the scheduled session
- [ ] **SESS-14**: User can receive a push reminder 30 minutes before a scheduled session

### Gamification

- [ ] **GAME-01**: Duo has one shared XP total with no individual XP totals
- [ ] **GAME-02**: Duo progresses through 50 thematic levels from `Lv1 Casuais` to `Lv50 Lendas do Coop`
- [ ] **GAME-03**: Level thresholds follow a versioned curve based on an approximate 1.18 multiplier
- [ ] **GAME-04**: Every XP award or deduction is applied once and remains auditable
- [ ] **GAME-05**: Duo can unlock approximately 50 seeded achievements
- [ ] **GAME-06**: User sees achievements grouped as Story, Coop-Sincronia, Compromisso, Descoberta, Streak, Roleta or Comedia
- [ ] **GAME-07**: User sees custom engraved-style SVG achievement icons without emoji
- [ ] **GAME-08**: User can view and filter the achievement grid by rarity
- [ ] **GAME-09**: Duo receives three weekly quests that reset Monday at 00:00 in the duo timezone
- [ ] **GAME-10**: Duo receives one monthly quest
- [ ] **GAME-11**: Duo can receive seasonal quests such as Spooky, Awards and Anniversary
- [ ] **GAME-12**: User can view weekly, monthly and seasonal quest progress on the challenges page
- [ ] **GAME-13**: Duo maintains a collaborative play streak
- [ ] **GAME-14**: User sees animated flame and freezing states for the streak
- [ ] **GAME-15**: Duo earns one Streak Freeze every ten levels
- [ ] **GAME-16**: Duo streak activity can be backed up until 04:00 in the duo timezone
- [ ] **GAME-17**: User sees rarity styling on games, achievements and reviews through meaningful neon gradient borders

### Roulette

- [ ] **ROUL-01**: Duo can open a roulette with a horizontal reel of 60 game covers and a central pointer
- [ ] **ROUL-02**: Roulette result is selected and persisted by the server before the reveal animation begins
- [ ] **ROUL-03**: Roulette reveal uses an approximately 5.5 second `cubic-bezier(.15,.85,.25,1)` motion
- [ ] **ROUL-04**: User can hear tick, drumroll and fanfare audio after an interaction and can mute it
- [ ] **ROUL-05**: User sees rarity borders on roulette games and particles for a Legendary result
- [ ] **ROUL-06**: Duo is guaranteed an Epic-or-higher result after ten roulette results without one
- [ ] **ROUL-07**: Duo can spend 100 shared XP on a roulette boost
- [ ] **ROUL-08**: Roulette applies a 20% weekend multiplier where the economy rules require it
- [ ] **ROUL-09**: Duo can lock the roulette result as the Jogando Principal game
- [ ] **ROUL-10**: Repeated or concurrent roulette requests cannot duplicate costs, pity progress or history

### Reviews, Hall And Duo Stats

- [ ] **HALL-01**: Each duo member can write a review for a completed game
- [ ] **HALL-02**: User sees both reviews side by side
- [ ] **HALL-03**: User sees the game's duo score as the average of both review scores
- [ ] **HALL-04**: Duo can revisit completed games in the Hall da Moral
- [ ] **HALL-05**: User sees the Hall da Moral as a CSS perspective shelf with an accessible flat alternative
- [ ] **HALL-06**: User can replay the duo history through a timeline derived from authoritative events
- [ ] **HALL-07**: Duo can view collaborative total coop hours
- [ ] **HALL-08**: Duo can view vibe match percentage, favorite game and paired days
- [ ] **HALL-09**: Duo stats never rank one member against the other

### Notifications, Jobs And Reliability

- [ ] **SAFE-01**: User is asked for push permission only after an action that explains its value
- [ ] **SAFE-02**: User can disable product push notifications
- [ ] **SAFE-03**: Catalog synchronization, streak checks, quest rotation and reminders continue through scheduled server jobs
- [ ] **SAFE-04**: Failed scheduled work can be retried without duplicating user-visible effects
- [x] **SAFE-05**: Secrets such as RAWG, email, auth and privileged database credentials never reach the browser
- [ ] **SAFE-06**: Critical status, XP, quest, achievement, session and roulette changes are applied atomically
- [x] **SAFE-07**: Authentication attempts are protected by persistent rate limiting suitable for a serverless runtime
- [x] **SAFE-08**: Authentication uses secure trusted origins, cookies and secrets in every deployed environment
- [x] **SAFE-09**: Development, preview or test, and production data use separate Neon branches

### Landing, Metadata And PWA

- [ ] **META-01**: Visitor sees a short scrollytelling landing with monumental `/2` hero, mini-roulette, three-step ritual, dashboard preview, Hall teaser and CTA
- [x] **META-02**: Visitor can reach custom QUEUE/2 login, signup and pairing pages
- [ ] **META-03**: Public pages use the default description `A fila e nossa. Descubram, sorteiem e zerem coops juntos.`
- [ ] **META-04**: Page titles follow the `[Page] - QUEUE/2` pattern
- [ ] **META-05**: Public metadata includes `og:site_name`, `og:type` and WebSite JSON-LD
- [ ] **META-06**: Shared links use a 1200x630 QUEUE/2 Open Graph image with monumental wordmark, game covers, tagline and URL
- [ ] **META-07**: User receives a complete favicon and app icon set including `.ico`, SVG, apple-touch, 512 and 1024 assets
- [ ] **META-08**: User can install QUEUE/2 as a PWA through a valid web app manifest

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Integrations And Platforms

- **V2-01**: User can import owned games and play history from a Steam profile
- **V2-02**: User can use a native mobile application if the responsive PWA proves insufficient

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| In-app chat | The duo already has communication channels and chat distracts from the backlog ritual. |
| Voice chat | It is outside the organization and celebration purpose. |
| Groups of three or more | `/2` is a product constraint and a brand promise. |
| Solo mode | Every session, reward and progress item belongs to the duo. |
| Public leaderboards | Gamification is collaborative, not competitive. |
| Direct browser access to Neon Data API | It is not required for v1 and the Data API remains Beta. |
| HLTB scraping | No official public API was identified and the product uses sourced neutral estimates instead. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 1 | Complete |
| AUTH-07 | Phase 1 | Complete |
| DUO-01 | Phase 1 | Complete |
| DUO-02 | Phase 1 | Complete |
| DUO-03 | Phase 1 | Complete |
| DUO-04 | Phase 1 | Complete |
| DUO-05 | Phase 1 | Complete |
| DUO-06 | Phase 1 | Complete |
| DUO-07 | Phase 1 | Complete |
| DUO-08 | Phase 1 | Complete |
| DUO-09 | Phase 1 | Complete |
| DUO-10 | Phase 1 | Complete |
| BRND-01 | Phase 1 | Complete |
| BRND-02 | Phase 1 | Complete |
| BRND-03 | Phase 1 | Complete |
| BRND-04 | Phase 1 | Complete |
| BRND-05 | Phase 1 | Complete |
| BRND-06 | Phase 1 | Complete |
| BRND-07 | Phase 7 | Pending |
| BRND-08 | Phase 7 | Pending |
| BRND-09 | Phase 7 | Pending |
| BRND-10 | Phase 7 | Pending |
| BRND-11 | Phase 1 | Complete |
| BRND-12 | Phase 7 | Pending |
| BRND-13 | Phase 1 | Complete |
| ARCH-01 | Phase 1 | Complete |
| ARCH-02 | Phase 1 | Complete |
| ARCH-03 | Phase 1 | Complete |
| ARCH-04 | Phase 1 | Complete |
| ARCH-05 | Phase 1 | Complete |
| ARCH-06 | Phase 1 | Complete |
| ARCH-07 | Phase 1 | Complete |
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 1 | Complete |
| DATA-05 | Phase 1 | Complete |
| DATA-06 | Phase 1 | Complete |
| DATA-07 | Phase 1 | Complete |
| DATA-08 | Phase 1 | Complete |
| DATA-09 | Phase 1 | Complete |
| DATA-10 | Phase 1 | Complete |
| DATA-11 | Phase 1 | Complete |
| DATA-12 | Phase 1 | Complete |
| SEC-01 | Phase 1 | Complete |
| SEC-02 | Phase 1 | Complete |
| SEC-03 | Phase 1 | Complete |
| SEC-04 | Phase 1 | Complete |
| SEC-05 | Phase 1 | Complete |
| SEC-06 | Phase 1 | Complete |
| SEC-07 | Phase 1 | Complete |
| SEC-08 | Phase 1 | Complete |
| SEC-09 | Phase 7 | Pending |
| SEC-10 | Phase 7 | Pending |
| SEC-11 | Phase 7 | Pending |
| CAT-01 | Phase 2 | Pending |
| CAT-02 | Phase 2 | Pending |
| CAT-03 | Phase 2 | Pending |
| CAT-04 | Phase 2 | Pending |
| CAT-05 | Phase 2 | Pending |
| CAT-06 | Phase 2 | Pending |
| CAT-07 | Phase 2 | Pending |
| LIB-01 | Phase 2 | Pending |
| LIB-02 | Phase 2 | Pending |
| LIB-03 | Phase 2 | Pending |
| LIB-04 | Phase 2 | Pending |
| LIB-05 | Phase 2 | Pending |
| DISC-01 | Phase 3 | Pending |
| DISC-02 | Phase 3 | Pending |
| DISC-03 | Phase 3 | Pending |
| DISC-04 | Phase 3 | Pending |
| DISC-05 | Phase 3 | Pending |
| DISC-06 | Phase 3 | Pending |
| DISC-07 | Phase 3 | Pending |
| DISC-08 | Phase 3 | Pending |
| DISC-09 | Phase 3 | Pending |
| DISC-10 | Phase 3 | Pending |
| DISC-11 | Phase 3 | Pending |
| DISC-12 | Phase 3 | Pending |
| PLAY-01 | Phase 4 | Pending |
| PLAY-02 | Phase 4 | Pending |
| PLAY-03 | Phase 4 | Pending |
| PLAY-04 | Phase 4 | Pending |
| PLAY-05 | Phase 5 | Pending |
| PLAY-06 | Phase 4 | Pending |
| PLAY-07 | Phase 4 | Pending |
| PLAY-08 | Phase 4 | Pending |
| PLAY-09 | Phase 4 | Pending |
| PLAY-10 | Phase 4 | Pending |
| PLAY-11 | Phase 4 | Pending |
| PLAY-12 | Phase 4 | Pending |
| PLAY-13 | Phase 4 | Pending |
| SESS-01 | Phase 4 | Pending |
| SESS-02 | Phase 4 | Pending |
| SESS-03 | Phase 4 | Pending |
| SESS-04 | Phase 4 | Pending |
| SESS-05 | Phase 4 | Pending |
| SESS-06 | Phase 4 | Pending |
| SESS-07 | Phase 4 | Pending |
| SESS-08 | Phase 4 | Pending |
| SESS-09 | Phase 4 | Pending |
| SESS-10 | Phase 4 | Pending |
| SESS-11 | Phase 4 | Pending |
| SESS-12 | Phase 4 | Pending |
| SESS-13 | Phase 4 | Pending |
| SESS-14 | Phase 4 | Pending |
| GAME-01 | Phase 5 | Pending |
| GAME-02 | Phase 5 | Pending |
| GAME-03 | Phase 5 | Pending |
| GAME-04 | Phase 5 | Pending |
| GAME-05 | Phase 5 | Pending |
| GAME-06 | Phase 5 | Pending |
| GAME-07 | Phase 5 | Pending |
| GAME-08 | Phase 5 | Pending |
| GAME-09 | Phase 5 | Pending |
| GAME-10 | Phase 5 | Pending |
| GAME-11 | Phase 5 | Pending |
| GAME-12 | Phase 5 | Pending |
| GAME-13 | Phase 5 | Pending |
| GAME-14 | Phase 5 | Pending |
| GAME-15 | Phase 5 | Pending |
| GAME-16 | Phase 5 | Pending |
| GAME-17 | Phase 5 | Pending |
| ROUL-01 | Phase 6 | Pending |
| ROUL-02 | Phase 6 | Pending |
| ROUL-03 | Phase 6 | Pending |
| ROUL-04 | Phase 6 | Pending |
| ROUL-05 | Phase 6 | Pending |
| ROUL-06 | Phase 6 | Pending |
| ROUL-07 | Phase 6 | Pending |
| ROUL-08 | Phase 6 | Pending |
| ROUL-09 | Phase 6 | Pending |
| ROUL-10 | Phase 6 | Pending |
| HALL-01 | Phase 7 | Pending |
| HALL-02 | Phase 7 | Pending |
| HALL-03 | Phase 7 | Pending |
| HALL-04 | Phase 7 | Pending |
| HALL-05 | Phase 7 | Pending |
| HALL-06 | Phase 7 | Pending |
| HALL-07 | Phase 7 | Pending |
| HALL-08 | Phase 7 | Pending |
| HALL-09 | Phase 7 | Pending |
| SAFE-01 | Phase 4 | Pending |
| SAFE-02 | Phase 4 | Pending |
| SAFE-03 | Phase 5 | Pending |
| SAFE-04 | Phase 4 | Pending |
| SAFE-05 | Phase 1 | Complete |
| SAFE-06 | Phase 6 | Pending |
| SAFE-07 | Phase 1 | Complete |
| SAFE-08 | Phase 1 | Complete |
| SAFE-09 | Phase 1 | Complete |
| META-01 | Phase 7 | Pending |
| META-02 | Phase 1 | Complete |
| META-03 | Phase 7 | Pending |
| META-04 | Phase 7 | Pending |
| META-05 | Phase 7 | Pending |
| META-06 | Phase 7 | Pending |
| META-07 | Phase 7 | Pending |
| META-08 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 164 total
- Mapped to phases: 164
- Unmapped: 0

---
*Requirements defined: 2026-06-03*
*Last updated: 2026-06-03 after architecture and security hardening*
