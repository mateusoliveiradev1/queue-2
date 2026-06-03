---
phase: 1
slug: fundacao-modular-marca-auth-e-dupla
status: approved
shadcn_initialized: false
preset: none
created: 2026-06-03T00:35:00-03:00
---

# Phase 1 - UI Design Contract

> Visual and interaction contract for Phase 1: Fundacao Modular, Marca, Auth E Dupla.
> Planner and executor must treat this as the source of truth for UI decisions in this phase.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn/ui source selectively, not visual preset |
| Preset | none |
| Component library | Radix UI primitives where behavior is useful |
| Icon library | Lucide React for utility icons; custom SVG for wordmark, `/2`, pointer, badges and brand moments |
| Font | Archivo Black for display, Inter Tight for body, JetBrains Mono for `/2`, codes and numerals |

Rules:
- Use Radix/shadcn for accessibility behavior, focus management and primitive structure.
- Do not keep default shadcn SaaS visual language.
- `packages/ui` owns brand primitives, form controls, buttons, toasts, loading mark and shared layout primitives.
- Domain-specific UI composition stays in `apps/web`; shared UI cannot import domain logic.

---

## Screen Contracts

### Public Auth Screens

Applies to `/login`, `/cadastro`, password recovery, reset password and email verification.

- Layout: central editorial panel on graphite background with light grain.
- Mobile: single column, panel fills useful width, touch targets at least 44px.
- Desktop: centered compact panel, not a wide split screen.
- Brand: QUEUE/2 wordmark above or inside the panel; `/2` can appear as compact mark.
- Form density: compact and direct, with clear labels, inline validation and visible focus.
- Password requirements: progressive checklist while typing.
- Verification screen: focused utility state with resend, edit email and sign out.
- No verified email means no app browsing and no pairing.

### Pairing Screen `/parear`

- Layout: one screen with two clear modes: create code and enter code.
- Use tabs, segmented control or equivalent accessible switcher.
- Create mode prioritizes code, copy action and expiration.
- Enter mode prioritizes six-character input, paste support and clear submit.
- Code should be visually large, mono, spaced for readability and copy-friendly.
- Expiration and revoke action remain visible but secondary.
- Pairing success uses microcelebration: `/2`, short motion, brand toast and copy that communicates the queue is now shared.
- Pairing errors use simple states: invalid, not active, rate limited, already paired, duo just formed.

### Authenticated Initial Dashboard

- Destination after duo is formed and named.
- Layout: editorial empty state, not a fake product dashboard.
- Show duo name, two members, pairing date or concise duo identity surface.
- Show ritual in three steps: descobrir, sortear, zerar.
- CTAs for future capabilities must be honest blocked next steps, not clickable placeholders pretending features exist.
- The page should make the product feel real while avoiding mock game cards or fake data.
- Brand energy is contained: wordmark, `/2`, graphite, off-white, lime, grain and pointer motif.

### Profile

- Includes display name editing, active sessions and sign out.
- Session management UI must be calm, legible and security-forward.
- Destructive session revocation requires clear copy but not theatrical confirmation.

### Duo Page

- Shows duo name, both members and pairing date.
- Allows either member to edit duo name and timezone.
- Timezone field starts from detected browser timezone and asks for confirmation.
- Preferences for notifications/audio live in settings/profile area with calm defaults.
- Push permission is not requested in Phase 1.

### Blocked or Future Features

- Routes or UI affordances for future phases may appear only as honest next steps.
- No fake library, fake game cards, fake stats, fake reviews or fake achievements.
- Attempting a blocked state uses calm toast plus focus on the next available step.

---

## Layout And Spacing Scale

Declared values use the project spacing scale and remain multiples of 4.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, hairline offsets, compact inline rhythm |
| sm | 8px | Form help text, small control gaps |
| md | 16px | Default form gaps, card inner rhythm |
| lg | 24px | Panel padding on mobile, grouped sections |
| xl | 32px | Panel padding on desktop, page block gaps |
| 2xl | 48px | Major sections, auth panel breathing room |
| 3xl | 72px | Desktop hero/dashboard spacing |
| 4xl | 112px | Large landing-scale spacing only if a Phase 1 auth screen needs a dramatic brand lockup |

Exceptions: none without explicit comment in implementation.

Layout constraints:
- Auth forms should stay narrow enough for quick completion: target 360-440px content width.
- Pairing code block may be wider, but must remain comfortable on mobile.
- Avoid nested cards. Prefer one strong surface with dividers or spatial grouping.
- Radius is mostly 4px; pill radius only for chips, segmented controls or small status tokens.

---

## Typography

| Role | Size | Weight | Line Height | Font |
|------|------|--------|-------------|------|
| Body | 16px | 400-500 | 1.5 | Inter Tight |
| Small / Help | 13-14px | 400-500 | 1.4 | Inter Tight |
| Label | 13px | 600 | 1.2 | Inter Tight |
| Form Control | 16px | 500 | 1.25 | Inter Tight |
| Heading | 24-32px | 800-900 | 1.05 | Archivo Black |
| Display / Wordmark | 48-96px responsive | 900 | 0.95 | Archivo Black + JetBrains Mono `/2` |
| Code / Pairing Code | 32-56px responsive | 700 | 1.0 | JetBrains Mono |

Rules:
- Display type is uppercase and tight, but body copy must stay readable.
- Pairing code uses JetBrains Mono and should visually group as six friendly characters.
- Avoid long all-caps paragraphs.
- Portuguese UI copy must be direct, confident and human, not generic SaaS.

---

## Color

Use the project OKLCH tokens directly.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `oklch(0.16 0.025 285)` | Page background, auth backdrop |
| Surface (30%) | `oklch(0.21 0.03 285)` | Panels, cards, inputs |
| Ink | `oklch(0.96 0.015 95)` | Primary text |
| Muted Ink | `oklch(0.72 0.02 95)` | Help text, secondary metadata |
| Primary Accent | `oklch(0.86 0.22 128)` | Primary CTA, `/2`, focus highlight, success emphasis |
| Secondary Accent | `oklch(0.62 0.27 305)` | Special accent only, not every interactive element |
| Destructive | To be derived from accessible red token | Revoke, sign out all, destructive errors |

Accent reserved for:
- Primary CTA.
- `/2` mark and wordmark accent.
- Focus rings and active switcher state.
- Pairing success microcelebration.
- Important status where lime means progress/confirmation.

Do not use:
- Neon glow as generic decoration.
- Violet shock for routine form controls.
- Rarity colors before rarity exists.
- Low-contrast graphite-on-graphite text.

---

## Motion

| Moment | Contract |
|--------|----------|
| Page transition | Minimal or none; auth must feel fast |
| `/2` loading | SVG stroke draw, not spinner |
| Pairing success | Short microcelebration, under 1200ms total |
| Toasts | Subtle entrance/exit; no excessive bounce |
| Reduced motion | Replace movement with opacity/color/state changes |

Motion rules:
- Motion must explain state or mark a meaningful product moment.
- No looping decorative motion in auth forms except optional very subtle favicon/mark treatment.
- `prefers-reduced-motion` must preserve all information.

---

## Component Contracts

### Buttons

- Primary: lime background or strong lime border depending contrast; direct verb copy.
- Secondary: graphite/off-white treatment with clear border.
- Destructive: reserved for revoke/sign out destructive cases.
- Disabled/future: visibly unavailable, with explanation nearby or toast on attempt.

### Inputs

- Sharp, dense, high-contrast surfaces.
- Visible focus ring using lime, meeting contrast.
- Inline error copy includes problem and recovery path.
- Pairing code input supports paste and normalizes casing.

### Toasts

- QUEUE/2-styled Sonner behavior is acceptable, but visual treatment must be custom.
- Routine auth feedback is calm.
- Pairing success gets a special but restrained variant.
- Toasts must be screen-reader reachable and not the only place critical information appears.

### Loading

- Use `/2` stroke animation with optional "Carregando a fila..." copy.
- No default spinner.

### Wordmark and Mark

- `QUEUE` uses Archivo Black uppercase with tight tracking.
- `/2` uses JetBrains Mono Bold, acid lime, visually attached to the wordmark.
- Compact mark is `/2` in sharp graphite square with subtle grain/engraved treatment.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Signup primary CTA | `Criar minha conta` |
| Login primary CTA | `Entrar na fila` |
| Verification heading | `Verifique seu email` |
| Verification body | `Enviamos um link para confirmar sua conta. Depois disso, voce segue para formar sua dupla.` |
| Resend verification | `Reenviar email` |
| Edit email | `Corrigir email` |
| Pairing create CTA | `Criar codigo da dupla` |
| Pairing join CTA | `Entrar com codigo` |
| Pairing success | `A fila agora e nossa.` |
| Initial dashboard heading | `A fila ainda esta vazia.` |
| Initial dashboard body | `Agora que a dupla existe, o proximo passo e descobrir jogos para colocar na fila.` |
| Ritual labels | `Descobrir`, `Sortear`, `Zerar` |
| Blocked future feature | `Esse passo vem depois. Por agora, sua dupla ja esta pronta para comecar.` |
| Invalid pairing code | `Esse codigo nao parece valido. Confira os seis caracteres e tente de novo.` |
| Inactive pairing code | `Esse codigo nao esta mais ativo. Peca um novo codigo para sua dupla.` |
| Rate limit pairing | `Muitas tentativas seguidas. Espere um pouco antes de tentar de novo.` |
| Already paired | `Voce ja esta em uma dupla. No QUEUE/2, a fila pertence a dois jogadores fixos.` |
| Sign out | `Sair` |
| Revoke session | `Encerrar sessao` |

Copy rules:
- Brazilian Portuguese.
- Short sentences.
- Avoid "solo", "meu progresso" or any copy that implies individual play progression.
- Error copy should say what happened and what the user can do.

---

## Accessibility Contract

- Keyboard navigation required for every auth, pairing, profile and duo control.
- Focus state must be visible on graphite background.
- Touch targets at least 44px for primary controls.
- Text contrast must satisfy WCAG AA minimum; target higher contrast for body text.
- Form errors must be programmatically associated with fields.
- Pairing code input must have accessible label and not rely on visual spacing alone.
- Toast content must not be the only source of critical state.
- Reduced motion must be implemented for loading and pairing success.
- Color must not be the only indicator of success, error or disabled state.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | Form-related primitives only if copied and restyled | Review generated diff; remove default styling assumptions |
| Radix UI | Dialog, tooltip, tabs/switcher, visually hidden where useful | Preserve accessibility behavior; restyle fully |
| Third-party blocks | None approved for Phase 1 | Must be explicitly reviewed before use |

---

## Out Of Scope For Phase 1 UI

- Game cards with real or fake catalog data.
- Library screens beyond honest blocked next-step references.
- Discovery, roulette, play sessions, achievements, Hall da Moral and duo review UI.
- Full landing page polish beyond links into login/signup/pairing if needed.
- High-energy rarity, achievement, level-up, roulette or zerada effects.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-06-03

Checker notes:
- Copy is specific enough for implementation and stays in Brazilian Portuguese.
- Visual direction matches the project contract: brutalismo editorial, calm utility and no default SaaS style.
- Color usage reserves lime/violet for meaningful emphasis and avoids generic neon overload.
- Typography follows Archivo Black, Inter Tight and JetBrains Mono roles.
- Spacing uses the established 4px-based scale and preserves mobile-first constraints.
- Registry usage is constrained to behavior primitives and requires restyling.
