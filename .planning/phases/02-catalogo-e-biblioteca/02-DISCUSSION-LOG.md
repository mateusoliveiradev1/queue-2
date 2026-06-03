# Phase 2: Catalogo E Biblioteca - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md; this log preserves the alternatives considered.

**Date:** 2026-06-03T16:29:02-03:00
**Phase:** 2-catalogo-e-biblioteca
**Areas discussed:** Catalogo RAWG e detalhe do jogo, Plataformas da dupla, Biblioteca e estados, Match score, Regras da biblioteca compartilhada, Detalhe da biblioteca

---

## Catalogo RAWG e detalhe do jogo

| Option | Description | Selected |
|--------|-------------|----------|
| Busca direta primeiro | Pessoa entra com um jogo em mente, busca, abre detalhe e adiciona a fila. | |
| Grade exploravel primeiro | Catalogo abre com jogos populares/relevantes, filtros simples e busca como apoio. | |
| Hibrido | Busca/sugestao em destaque no topo, com grade/lista de apoio. | X |

**User's choice:** Hibrido, with correction that the original prototype was closer to Tinder: games appeared automatically and the two members would later both need to want the game for a match.
**Notes:** The user was concerned that the discussion was drifting from the prototype. The captured decision aligns Phase 2 with the original direction while keeping the actual two-person match in Phase 3.

---

## Fonte, frescor e dados ausentes

| Option | Description | Selected |
|--------|-------------|----------|
| Fonte discreta e sempre presente | Cards/detail show RAWG and update date as metadata; time/availability show source only when present. | X |
| Fonte bem evidente | Badges of source and freshness in most data blocks. | |
| Fonte so no detalhe | Cards stay cleaner; full attribution appears on detail page. | |

**User's choice:** Fonte discreta e sempre presente.
**Notes:** The UI must satisfy RAWG attribution and freshness without becoming visually heavy.

| Option | Description | Selected |
|--------|-------------|----------|
| Mostrar ausencia com honestidade | Say "Sem fonte confiavel ainda" or "Nao verificado"; do not invent data. | X |
| Ocultar o campo | Only show estimated time or availability when sourced. | |
| Permitir preenchimento manual ja na Fase 2 | Duo can add manual data, marked as manual. | |

**User's choice:** Mostrar ausencia com honestidade.
**Notes:** Estimated time and availability should not be fabricated.

---

## Escopo coop de campanha

| Option | Description | Selected |
|--------|-------------|----------|
| Filtro rigido | Main flow only includes games confirmed as campaign/story coop for two. | X |
| Mostrar como nao verificado | Show separately with warning; do not recommend as ideal. | |
| Deixar a dupla decidir | Show normally if coop tags exist and let the duo correct later. | |

**User's choice:** Filtro rigido.
**Notes:** User clarified that QUEUE/2 should focus on games playable by two people in coop, especially games that can be completed together through the story/campaign.

---

## Plataformas da dupla

| Option | Description | Selected |
|--------|-------------|----------|
| Plataformas simples | PC, PlayStation, Xbox, Switch, Steam Deck. | |
| Plataformas + lojas/servicos | Include Steam, Epic, Game Pass, PS Plus etc. as member settings. | |
| Simples agora, servicos como disponibilidade | Members mark platforms; services appear as sourced game availability metadata. | X |

**User's choice:** Simples agora, servicos como disponibilidade.
**Notes:** Game Pass and similar services are not personal platforms in this phase.

| Option | Description | Selected |
|--------|-------------|----------|
| Nao recomendar no fluxo principal | Exclude games without common platform from the main suggestion flow. | |
| Mostrar com alerta | Show with strong "sem plataforma em comum" warning. | |
| Permitir na Wishlist mesmo assim | Do not recommend, but allow manual Wishlist tracking. | X |

**User's choice:** Permitir na Wishlist mesmo assim.
**Notes:** The main flow should avoid frustrating recommendations, but the duo can still track future purchases/plans.

---

## Biblioteca e estados

| Option | Description | Selected |
|--------|-------------|----------|
| Todos os estados basicos | Wishlist, Jogando, Pausado, Dropado and Zerado selectable now. | |
| So Wishlist e Jogando | Dropado/Zerado wait for double confirmation phase. | |
| Todos visiveis, alguns bloqueados | Wishlist/Jogando/Pausado work; Dropado/Zerado appear blocked until Phase 4. | X |

**User's choice:** Todos visiveis, alguns bloqueados.
**Notes:** This preserves the full map while avoiding premature double-confirmation behavior.

| Option | Description | Selected |
|--------|-------------|----------|
| Colunas por estado | Good for desktop. | |
| Lista com filtros/tabs | Better for mobile. | |
| Hibrido responsivo | Mobile tabs/list; desktop denser by status. | X |

**User's choice:** Hibrido responsivo.
**Notes:** Matches prior decision that mobile is first, but desktop can be denser for library/discovery.

---

## Match score

| Option | Description | Selected |
|--------|-------------|----------|
| Compatibilidade pratica | Common platform + confirmed coop + time/availability when sourced. | X |
| Interesse manual | Each member marks desire and score combines interest. | |
| Placeholder discreto | Show score will come later, without calculating now. | |

**User's choice:** Compatibilidade pratica.
**Notes:** This avoids implementing emotional preference before Phase 3.

| Option | Description | Selected |
|--------|-------------|----------|
| Explicavel por fatores | Product label plus short reasons such as platform and coop fit. | X |
| Numero/percentual | Example "82% match", with explanation on detail. | |
| Sem numero agora | Only compatibility badges; numeric score later. | |

**User's choice:** Explicavel por fatores.
**Notes:** Avoid fake precision before preference data exists.

---

## Regras da biblioteca compartilhada

| Option | Description | Selected |
|--------|-------------|----------|
| Qualquer membro altera a fila compartilhada | Add/move changes the duo library for both. | X |
| Tudo exige confirmacao dos dois | Every status change needs partner approval. | |
| So Jogando exige cuidado extra | Wishlist/Pausado are free; Jogando asks confirmation or stronger warning. | |

**User's choice:** Qualquer membro altera a fila compartilhada.
**Notes:** Keeps Phase 2 lightweight and shared; heavy confirmations belong to Zerado/Dropado later.

| Option | Description | Selected |
|--------|-------------|----------|
| Estado simples | Becomes Jogando, with no Principal/secondary behavior. | |
| Limite ja preparado | At most 3 games in Jogando, no full drag/reorder yet. | X |
| Principal ja aparece | First Jogando becomes Principal automatically. | |

**User's choice:** Limite ja preparado.
**Notes:** Protects the future Phase 4 invariant without pulling in the full dashboard/session model.

---

## Detalhe da biblioteca

| Option | Description | Selected |
|--------|-------------|----------|
| Blocos reservados e vazios | Show empty session/progress sections now. | |
| Resumo minimo preparatorio | Status, platforms, compatibility and a short journey-start area. | X |
| So detalhe atual | Do not show future session/progress concepts until Phase 4. | |

**User's choice:** Resumo minimo preparatorio.
**Notes:** Prepares the future flow without filling the UI with dead sections.

---

## the agent's Discretion

- Exact microcopy and metadata placement.
- Exact enum labels for platforms and compatibility factors.
- Exact responsive layout composition, as long as it follows the Phase 2 decisions and existing QUEUE/2 visual language.

## Deferred Ideas

- Real two-person swipe/match behavior belongs to Phase 3.
- Full Principal/secondary ordering, sessions, checkpoints, progress and milestones belong to Phase 4.
- Double confirmation for Zerado and Dropado belongs to Phase 4.
