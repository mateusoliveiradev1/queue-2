# Phase 07: Paridade Visual E UX Com Prototipo - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-09T21:04:50.9472964-03:00
**Phase:** 07-paridade-visual-e-ux-com-prototipo
**Areas discussed:** Navegacao autenticada horizontal, Landing e auth compactos, Ritmo das rotas internas, Estados vazios e copy editorial, Disciplina visual dos componentes

---

## Navegacao autenticada horizontal

| Question | Options | Selected |
|----------|---------|----------|
| Conjunto principal no topo desktop | Sete principais; Todas as rotas; Voce decide | Sete principais |
| Equivalente mobile | Topo sticky com trilho horizontal; Bottom nav mantida; Menu/drawer compacto | Topo sticky com trilho horizontal |
| Estado ativo da rota | Slash lime + underline fino; Pilula preenchida lime; Apenas texto lime | Slash lime + underline fino |
| Tratamento de Catalogo e Conquistas | Links contextuais fortes; Menu Mais no topo; Adicionar no trilho mobile apenas | Links contextuais fortes |
| Fidelidade aos prints | Fidelidade alta de composicao; Fidelidade so de tokens; Replica quase literal | Fidelidade alta de composicao |
| Rotas densas com muitos controles | Navbar global separada dos controles; Misturar controles no topo global; Ocultar parte da navbar | Navbar global separada dos controles |
| Sticky behavior | Sticky discreto; Nao sticky; Sticky so no mobile | Sticky discreto |
| Hall antes da Phase 8 | Mostrar Hall no topo com estado preparado; Esconder ate Phase 8; Criar Hall completo agora | Mostrar Hall no topo com estado preparado |

**User's choice:** Navbar global em todas as rotas internas, com sete rotas principais, mobile horizontal sticky, ativo com slash/ponteiro lime e underline fino, Catalogo/Conquistas contextuais e Hall preparado com copy honesta.

**Notes:** The user asked whether the Home tiles from the print would also exist and clarified that the navbar must appear across all authenticated routes, not only Home. The user also emphasized not drifting away from the prints.

---

## Landing e auth compactos

| Question | Options | Selected |
|----------|---------|----------|
| Fidelidade da home publica ao prototipo | Hero monumental + tres passos logo abaixo; Home atual refinada; Landing mais longa | Hero monumental + tres passos logo abaixo |
| Copy central da landing | Marca primeiro, copy minima; Ritual mais explicado; Copy mais emocional | Marca primeiro, copy minima |
| Login/cadastro routing | Rotas separadas, tabs visuais cruzadas; Uma rota unica com tabs reais; Manter links simples | Rotas separadas, tabs visuais cruzadas |
| Telas publicas secundarias | Mesmo sistema compacto; Pareamento mais especial, auth secundario simples; Cada tela com composicao propria | Mesmo sistema compacto |

**User's choice:** Public landing should be brand-first and close to the prototype, with minimal copy and three steps below. Login/signup keep separate routes but share visual tabs. Recovery, verification and pairing use the same compact public system.

**Notes:** The user explicitly asked to use the Impeccable repository to improve the design and copy. The decision captured Impeccable as a process reference only, not a visual aesthetic replacement.

---

## Ritmo das rotas internas

| Question | Options | Selected |
|----------|---------|----------|
| How to apply redesign internally | Sistema compartilhado + ajustes por rota; Revisao profunda rota por rota; So CSS global por cima | Sistema compartilhado + ajustes por rota |
| Strongest first-fold treatment | Home /app como ancora; Descobrir e Roleta primeiro; Todas com mesma intensidade | Home /app como ancora |
| Biblioteca/Descobrir/Roleta control density | Primeiro fold forte, controles compactos abaixo; Controles primeiro; Visual primeiro, controles escondidos | Primeiro fold forte, controles compactos abaixo |
| Desafios/Dupla/Perfil treatment | Utilitario seco com hierarquia forte; Mesmo peso visual da Home; Manter quase como esta | Utilitario seco com hierarquia forte |

**User's choice:** Shared route-wide visual system, with Home `/app` as the authenticated anchor and strong first folds for functional routes. Utility routes stay dry, compact and strongly aligned to the prints.

**Notes:** The user reiterated that these routes should be like the prints.

---

## Estados vazios e copy editorial

| Question | Options | Selected |
|----------|---------|----------|
| Empty-state tone | Brutalista curto + acao clara; Explicativo e acolhedor; Quase so visual | Brutalista curto + acao clara |
| Priority empty states | Home, Biblioteca, Roleta e Hall; Todos com mesmo peso; So Home e Roleta | Home, Biblioteca, Roleta e Hall |
| Incomplete features copy | Honesto e curto; Provocacao forte; Esconder totalmente | Honesto e curto |
| Empty-state CTA count | Uma acao primaria + no maximo uma secundaria; Varios atalhos; So uma acao sempre | Uma acao primaria + no maximo uma secundaria |

**User's choice:** Empty states should use short brutalist copy and direct actions. Home, Biblioteca, Roleta and Hall are highest priority. Hall/Resenhas use honest "em breve/por enquanto" copy without active-flow CTAs.

**Notes:** The user asked whether the existing beautiful loading system remains. The answer locked that the `/2` SVG stroke loading stays and must not become a generic spinner.

---

## Disciplina visual dos componentes

| Question | Options | Selected |
|----------|---------|----------|
| Cards, surface-band and panels | Reduzir cards, manter paineis secos; Manter cards, so ajustar visual; Remover quase todos os paineis | Reduzir cards, manter paineis secos |
| Lime/violet usage | Lime disciplinado, violet raro; Lime em quase tudo interativo; Lime + violet com mais energia | Lime disciplinado, violet raro |
| Typography rule | Headings fortes, labels mono, body legivel; Tudo bem grande e uppercase; Tipografia atual com pequenos ajustes | Headings fortes, labels mono, body legivel |
| Visual regression gates | Overflow, overlap, contraste, foco e mobile; So screenshots e axe; Auditoria manual apenas | Overflow, overlap, contraste, foco e mobile |

**User's choice:** Reduce generic card UI and use dry panels like the prints. Lime is disciplined, violet is rare, typography is strong but controlled, and visual gates must catch overflow, overlap, contrast, focus, touch targets, mobile, screenshots, axe and reduced motion.

**Notes:** The user asked if the recommended panel approach was the one most like the prints; that was confirmed and locked.

---

## the agent's Discretion

- Exact final copy variants may be polished through Impeccable-style clarify/polish, while staying short, PT-BR and faithful to QUEUE/2.
- Exact layout metrics, breakpoints, sticky offsets, widths and scroll behavior are left to planning/implementation, gated by screenshots and overflow checks.
- Exact contextual locations for `Catalogo` and `Conquistas` may be chosen during planning as long as they do not become global top-nav items.

## Deferred Ideas

- Resenhas, full Hall shelf, replay timeline and completed-game memory experience belong to Phase 8.
- Phase 7 may show Hall/Resenhas as honest prepared or empty states only.
