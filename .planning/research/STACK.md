# Stack Research

**Domain:** Aplicacao web colaborativa para backlog, descoberta e ritual de jogos coop
**Researched:** 2026-06-03
**Confidence:** HIGH

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

```bash
# Core
pnpm add next@16.2.7 react@19.2.7 react-dom@19.2.7 better-auth@1.6.14 drizzle-orm@0.45.2 @neondatabase/serverless@1.1.0 pg@8.21.0 zod@4.4.3

# UI and integrations
pnpm add tailwindcss@4.3.0 motion@12.40.0 @dnd-kit/core@6.3.1 @dnd-kit/sortable@10.0.0 swr@2.4.1 web-push@3.6.7 resend@6.12.4 @react-email/components@1.0.12 lucide-react@1.17.0 sonner@2.0.7

# Dev dependencies
pnpm add -D turbo@2.9.16 typescript@5.9.3 drizzle-kit@0.31.10 vitest@4.1.8 @playwright/test@1.60.0 @testing-library/react@16.3.2 axe-core@4.12.0 @types/pg@8.20.0
```

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

**Se a acao altera XP, pity, status ou confirmacoes:**
- Execute em funcao de dominio no servidor dentro de uma unica transacao.
- Registre idempotency key e evento de dominio quando houver efeitos derivados.

**Se a interface precisa parecer atualizada para os dois jogadores:**
- Use mutation otimista apenas para estados reversiveis.
- Revalide o estado autoritativo do servidor; nao confie em estado local para premios ou confirmacoes.

**Se um job depende de horario:**
- Armazene timezone da dupla e dados do job no banco.
- Use o cron apenas como runner que busca trabalhos vencidos e idempotentes.

**Se um pacote e usado apenas pela aplicacao web:**
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

---
*Stack research for: QUEUE/2*
*Researched: 2026-06-03*
