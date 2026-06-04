# Phase 3: Descoberta E Matches - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-04T00:40:35.0014956-03:00
**Phase:** 3-Descoberta E Matches
**Areas discussed:** Ritual de descoberta, Regra de match, Mood e filtros, Recomendacao, Destino do jogo descoberto, Animacoes e relacao com roleta

---

## Ritual de descoberta

| Decision | Recommended option selected | Alternatives considered |
|----------|-----------------------------|-------------------------|
| Main structure | Deck central | Modos em abas; hub de modos |
| Mode placement | Acoes acima do deck | Trilho lateral/desktop + menu mobile; tela separada por modo |
| Match Live shape | Sessao curta compartilhada | Deck sempre ao vivo; sala totalmente sincronizada |
| Repeating evaluated games | Nao repetir no deck padrao | Reaparecer depois de um tempo; controle manual |
| Visual direction | Inspirado em swipe com identidade QUEUE/2 | Muito parecido com Tinder; catalogo gamificado sem swipe |
| Animation quality | Fluidas, premium e acessiveis | Discretas/utilitarias; muito chamativas/arcade |

**User's choice:** Selected the recommended option for each decision.
**Notes:** User explicitly asked if this is where the app gets the Tinder-like experience. The agreed answer is yes: Phase 3 is Tinder-like in interaction, but must keep QUEUE/2 identity and avoid being a clone.

---

## Regra de match

| Decision | Recommended option selected | Alternatives considered |
|----------|-----------------------------|-------------------------|
| Card actions | Quero jogar / Agora nao / Pular | Curtir/Rejeitar; Quero/Talvez/Nao quero |
| Match condition | Dois `Quero jogar` | Quero + talvez; Quero as invitation |
| `Agora nao` meaning | Temporary cooldown | Definitive rejection; no recommendation effect |
| `Pular` meaning | No judgment, only changes card | Returns quickly; weak negative signal |
| Match next step | Celebrate and offer to add to queue | Auto-add to Wishlist; open game detail |

**User's choice:** Selected the recommended option for each decision.
**Notes:** Match must remain explicit duo consent. Celebration comes before queue action, but library entry is conscious.

---

## Mood e filtros

| Decision | Recommended option selected | Alternatives considered |
|----------|-----------------------------|-------------------------|
| Mood quiz content | Energy, commitment and vibe | Genre/platform/time questions; more narrative/personal questions |
| Who answers quiz | Both members when possible | Solo-only was rejected implicitly through discussion |
| Incomplete quiz | Solo answer is preview only | Treat solo answer as full duo result |
| Different answers | Conservative intersection | Alternation; two separate paths |
| Always-visible filters | Estimated time, common platform, availability | All filters visible; filters only in search |
| Common platform | Automatic and enabled by default | Mandatory; manual |
| Advanced filters | `Mais filtros` drawer | Horizontal chips; separate advanced search page |
| Rarity meaning | QUEUE/2 editorial rarity | Usage statistics; external popularity metadata |

**User's choice:** Selected the recommended option for each decision.
**Notes:** User asked whether the quiz is for both members. The decision is that mood belongs to the duo and should combine both answers when possible.

---

## Recomendacao

| Decision | Recommended option selected | Alternatives considered |
|----------|-----------------------------|-------------------------|
| Cold-start ranking | Tags + practical compatibility | Manual curation first; RAWG/external popularity first |
| Collaborative filtering timing | Only after clear minimum volume | Low weight from start; v1 defer entirely |
| Recommendation explanation | Short reasons on cards | Detailed detail-page panel; no deck explanation |
| Negative signals | Separate intensity | Everything non-Quero is negative; almost no negative weighting |
| Variety vs precision | Precision with variety breathing room | Maximum precision; high variety |

**User's choice:** Selected the recommended option for each decision.
**Notes:** Recommendation should build on Phase 2 qualitative match-score language and avoid fake numeric precision.

---

## Destino do jogo descoberto

| Decision | Recommended option selected | Alternatives considered |
|----------|-----------------------------|-------------------------|
| Available statuses | Wishlist, Jogando or Pausado when valid | Wishlist only; all statuses |
| After adding | Stay in Discovery with confirmation | Go to Biblioteca; open game detail |
| Already in library | Show current status and allow valid move | Remove from deck; show blocked |
| Match history | Polished focused match history | No history; full Hall/timeline |
| Match Live notification | In-app immediate + push only with opt-in | In-app only; aggressive push |
| Surprise mode | Unseen and compatible game | Any unseen game; rare/out-of-bubble game |
| Autocomplete | Fast entry into Discovery | Separate catalog-style search; exact-name only |

**User's choice:** Selected the recommended option for each decision.
**Notes:** User asked if a more complete and beautiful match history would be bad. Decision: it is good, but must stay focused on matches/status/actions and not become Phase 7 Hall.

---

## Relacao com roleta futura

| Decision | Selected position | Alternatives considered |
|----------|-------------------|-------------------------|
| Role of Discovery | Forms the consented pool | Discovery directly chooses next game |
| Role of future roulette | Chooses next game from eligible queued games | Roulette discovers raw unseen catalog entries |
| Automatic entry | Matches do not auto-enter roulette | Every match automatically enters roulette |

**User's choice:** Agreed that Discovery should feed the future roulette pool only through conscious library additions.
**Notes:** User asked whether the Tinder-like flow chooses games for the future roulette and whether that would be bad. Decision: it is good if Discovery answers "queremos jogar isso?" and Phase 6 roulette later answers "qual desses jogos vamos jogar agora?".

---

## the agent's Discretion

- Exact cooldown duration.
- Exact collaborative-filtering data threshold.
- Exact editorial rarity labels.
- Exact mood quiz copy.
- Exact animation timing/physics and reduced-motion substitute.
- Exact persistence schema and live-state transport, as long as modular/security rules are preserved.

## Deferred Ideas

- Phase 4: sessions, playing-now, progress, scheduling, push session reminders, Zerado/Dropado double confirmation.
- Phase 6: CS-like roulette/case-opening draw.
- Phase 7: Hall, reviews, deep stats and replay timeline.
