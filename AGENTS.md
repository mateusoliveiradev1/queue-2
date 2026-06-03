<!-- GSD:project-start source:PROJECT.md -->
## Project

**QUEUE/2**

QUEUE/2, lido como "queue dois", e um produto web publico para duplas fixas de jogadores organizarem o backlog real de jogos que querem zerar juntas. O app transforma a indecisao sobre o proximo coop em um ritual compartilhado: descobrir jogos, formar matches, sortear a fila, jogar, registrar progresso e celebrar cada zerada.

O nome comunica as duas camadas centrais do produto: `Queue` e a fila de jogos da dupla; `/2` determina que toda experiencia pertence a exatamente dois jogadores. A tagline e: **"A fila e nossa."**

**Core Value:** A dupla vive um ritual completo e memoravel para descobrir, escolher, jogar e celebrar jogos coop junta.

### Constraints

- **Product model**: Cada duo possui exatamente dois jogadores - `/2` e uma promessa de produto, nao apenas branding.
- **Collaboration**: Nao existe progresso individual competitivo - toda gamificacao deve reforcar a dupla.
- **Release scope**: Todo o Plano Final v7 pertence a v1 - fases organizam a construcao, mas nao removem funcionalidades previstas.
- **Platform**: Web responsiva primeiro - aplicativo nativo esta fora de escopo.
- **Database**: Neon Postgres substitui Lovable Cloud - dados, migrations e isolamento devem ser projetados para PostgreSQL.
- **Authentication**: Better Auth self-hosted substitui Neon Auth e Clerk - a equipe assume operacao e configuracao segura do sistema de auth.
- **Framework**: Next.js App Router e Vercel formam a base de producao - o prototipo Lovable permanece apenas como referencia visual.
- **Repository**: `pnpm` workspaces e Turborepo organizam a aplicacao web, banco, UI e configuracoes compartilhadas sem separar o produto em microfrontends.
- **Architecture**: O monolito modular possui dominios com APIs publicas e checks automaticos - imports internos entre dominios e regras de negocio em routes/UI sao proibidos.
- **Security**: Dados de uma dupla nunca podem vazar para outra - autorizacao de servidor e RLS devem ser verificadas.
- **Assurance**: Seguranca absoluta e banco perfeito nao sao promessas tecnicamente honestas - a v1 usa contratos verificaveis, ASVS Level 2, least privilege, restore testado e gates de release.
- **Secrets**: `RAWG_API_KEY`, credenciais de email, secrets de auth e conexoes privilegiadas permanecem no servidor.
- **External data**: RAWG exige atribuicao; tempo estimado e disponibilidade precisam expor fonte e frescor.
- **Visual quality**: UI deve parecer produto intencional e proprio, nao template SaaS ou arcade neon generico.
- **Accessibility**: Contraste, foco, touch targets e reduced motion nao podem ser sacrificados pela estetica.
- **Language**: A experiencia principal e escrita em portugues brasileiro.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | 24 LTS | Runtime local, build e funcoes de servidor | E a linha Active LTS atual e reduz risco operacional para um projeto novo. |
| pnpm | 11.5.1 | Package manager e workspaces | Possui suporte nativo a monorepos e protocolo `workspace:` para dependencias locais explicitas. |
| Turborepo | 2.9.16 | Orquestracao do monorepo | Coordena build, lint, typecheck e testes dos pacotes compartilhados com cache e grafo de dependencias. |
| Next.js | 16.2.7 | Framework full-stack React | App Router oferece routing, Server Components, Route Handlers, metadata, OG image e PWA com suporte maduro na Vercel. |
| React | 19.2.7 | Camada de interface | Versao compativel com Next.js 16 para UI responsiva e interativa. |
| TypeScript | 5.9.3 | Tipagem estatica | Linha 5.x conservadora enquanto TypeScript 6 ainda exige validacao explicita de compatibilidade no ecossistema. |
| Neon Postgres | Postgres gerenciado | Banco principal | Regras de dupla, XP, pity, confirmacoes e RLS se beneficiam de transacoes e constraints relacionais. |
| Better Auth | 1.6.14 | Autenticacao self-hosted | Preserva controle sobre UX e configuracao, usa Postgres e evita tornar Neon Auth Beta uma dependencia critica. |
| Drizzle ORM | 0.45.2 | Schema, queries e migrations tipadas | Mantem SQL e transacoes visiveis, sem esconder recursos importantes de Postgres. |
| Tailwind CSS | 4.3.0 | Tokens e estilos utilitarios | Permite implementar a identidade QUEUE/2 com controle direto, sem depender de um tema visual generico. |
| Vercel | Plataforma gerenciada | Deploy, Functions, previews e Cron | Integra naturalmente com Next.js e suporta os jobs agendados necessarios. |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@neondatabase/serverless` | 1.1.0 | Conexao serverless com Neon | Use em runtime Node da aplicacao, com conexao pooled e regiao alinhada ao banco. |
| `pg` | 8.21.0 | Driver Postgres Node | Use quando a integracao Drizzle ou um fluxo transacional exigir semantica completa de conexao. |
| `zod` | 4.4.3 | Validacao de entrada | Use na fronteira de Route Handlers, Server Actions, jobs e integracoes externas. |
| `motion` | 12.40.0 | Animacoes de produto | Use para roleta, matches, level-up e transicoes com suporte a reduced motion. |
| `@dnd-kit/core` | 6.3.1 | Drag and drop acessivel | Use para ordenar os jogos em Jogando. |
| `@dnd-kit/sortable` | 10.0.0 | Lista ordenavel | Use junto ao dnd-kit core para Principal e secundarios. |
| Radix UI primitives | Current compatible | Primitivos acessiveis | Use apenas como fundacao comportamental para dialog, tooltip, tabs e popover. |
| shadcn/ui source | Current compatible | Codigo-fonte de componentes | Use seletivamente e reestilize; nao adote o visual padrao SaaS. |
| Lucide React | 1.17.0 | Icones utilitarios | Use em acoes comuns; marca, raridades e conquistas devem ter SVG customizado. |
| SWR | 2.4.1 | Revalidacao cliente | Use para estados compartilhados que precisam atualizar sem WebSocket persistente, como confirmacoes. |
| `web-push` | 3.6.7 | Envio de push web | Use para lembretes de sessao e match live depois de opt-in explicito. |
| Resend | 6.12.4 | Email transacional | Use para verificacao de email e recuperacao de senha. |
| `@react-email/components` | 1.0.12 | Templates de email | Use para emails consistentes com a marca. |
| Sonner | 2.0.7 | Base comportamental do toaster | Use com estilos QUEUE/2 customizados; nao exponha o visual padrao da biblioteca. |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| Drizzle Kit 0.31.10 | Gerar e aplicar migrations | Migrations devem conter tambem policies RLS, funcoes e constraints SQL quando necessario. |
| Vitest 4.1.8 | Testes unitarios e de dominio | Priorize regras de XP, pity, niveis, streaks e recomendacao. |
| Playwright 1.60.0 | Testes end-to-end | Cubra pareamento, sessao live, dupla confirmacao, roleta e isolamento entre duplas. |
| Testing Library 16.3.2 | Testes de componentes | Valide comportamento e acessibilidade, nao detalhes de implementacao. |
| axe-core 4.12.0 | Auditoria de acessibilidade | Inclua nos fluxos visuais de maior risco. |
| Neon branches | Ambientes isolados | Separe desenvolvimento, preview, testes e producao. |
## Installation
# Core
# UI and integrations
# Dev dependencies
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js App Router | TanStack Start | Reavaliar depois do v1 estavel do TanStack Start ou se o projeto exigir seu modelo de router acima da maturidade operacional. |
| Better Auth self-hosted | Neon Auth | Usar quando o produto aceitar Neon Auth Beta e preferir operacao gerenciada a controle total. |
| Drizzle ORM | Prisma | Usar se a equipe priorizar o ecossistema Prisma e aceitar mais distancia de SQL/RLS. |
| Server-mediated data access | Neon Data API | Reavaliar quando a Data API sair de Beta e houver um caso claro para acesso direto ou edge. |
| Vercel Cron + job table | Scheduler externo | Usar se o plano Vercel nao permitir a frequencia de lembretes ou se forem necessarias garantias de retry gerenciadas. |
| Turborepo enxuto | Repositorio Next.js unico | Um repositorio unico seria mais simples se nao houvesse desejo de monorepo ou pacotes compartilhados com fronteiras reais. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Lovable Cloud como backend | Foi removido da arquitetura e nao atende a necessidade de controle transacional e portabilidade. | Neon Postgres. |
| Clerk | O usuario rejeitou a dependencia e a UX de provedor; nao e necessario para o escopo. | Better Auth self-hosted. |
| Neon Auth como base critica | Neon Auth com Better Auth ainda esta em Beta. | Better Auth rodando no runtime da aplicacao. |
| Neon Data API como caminho principal | A Data API ainda esta em Beta e aumentaria dependencia de uma interface em evolucao. | Queries de servidor para Neon com RLS como defesa em profundidade. |
| HLTB scraping | Nao ha API publica oficial identificada e o uso pode criar risco legal e operacional. | Campo neutro `tempo estimado` com fonte e override manual. |
| WebSocket persistente desde o inicio | Aumenta operacao sem ser necessario para a maioria dos estados de dupla. | Revalidacao, polling curto e push onde faz sentido. |
| Tema shadcn padrao | Produziria a aparencia SaaS generica que o projeto quer evitar. | Tokens e composicao QUEUE/2 sobre primitivos acessiveis. |
| Microfrontends | Um unico produto e um unico time nao justificam deploys independentes e roteamento distribuido. | Um app `apps/web` com pacotes compartilhados. |
## Stack Patterns by Variant
- Execute em funcao de dominio no servidor dentro de uma unica transacao.
- Registre idempotency key e evento de dominio quando houver efeitos derivados.
- Use mutation otimista apenas para estados reversiveis.
- Revalide o estado autoritativo do servidor; nao confie em estado local para premios ou confirmacoes.
- Armazene timezone da dupla e dados do job no banco.
- Use o cron apenas como runner que busca trabalhos vencidos e idempotentes.
- Mantenha-o em `apps/web` ate existir uma fronteira compartilhada real.
- Extraia apenas banco, UI e configuracoes comuns no scaffold inicial.
## Version Compatibility
| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 16.2.7 | React 19.2.7 | Base recomendada para scaffold. |
| Better Auth 1.6.14 | Next.js App Router | A integracao oficial expoe handler para Route Handlers. |
| Drizzle ORM 0.45.2 | Drizzle Kit 0.31.10 | Fixar ambos no scaffold e atualizar juntos com migration review. |
| Tailwind CSS 4.3.0 | Next.js 16.2.7 | Use tokens CSS em OKLCH e evite esconder a identidade em presets. |
| TypeScript 5.9.3 | Stack acima | Escolha conservadora; validar antes de migrar para TypeScript 6. |
## Sources
- https://nodejs.org/en/about/previous-releases - status das linhas LTS do Node.js.
- https://pnpm.io/workspaces - suporte nativo a workspaces e protocolo `workspace:`.
- https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository - estrutura recomendada de repositorio.
- https://nextjs.org/docs/app - App Router, metadata, Route Handlers, PWA e testes.
- https://tanstack.com/start/latest/docs/framework/react/overview - TanStack Start ainda em Release Candidate.
- https://better-auth.com/docs/integrations/next - integracao Better Auth com Next.js.
- https://better-auth.com/docs/adapters/drizzle - adapter Drizzle.
- https://orm.drizzle.team/docs/connect-neon - conexao Drizzle com Neon.
- https://neon.com/docs/auth/overview - Neon Auth Beta e quando self-hosting Better Auth faz sentido.
- https://neon.com/docs/data-api/overview - Neon Data API Beta.
- https://vercel.com/docs/cron-jobs - cron em Vercel Functions.
- npm registry - versoes verificadas em 2026-06-03.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

The binding modular architecture contract is `.planning/ARCHITECTURE.md`.
The binding security and data contract is `.planning/SECURITY.md`.

Read both files before changing module boundaries, database schema, authentication, authorization, server actions, route handlers, jobs or integrations.

Key rules:
- The product is one modular Next.js application, not microfrontends.
- Domain modules expose public entrypoints and cannot deep-import each other's internals.
- Business rules do not live in routes, React components or infrastructure adapters.
- The web runtime uses least-privileged database access with forced RLS for duo-scoped data.
- Known critical or high security findings block phase completion.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
