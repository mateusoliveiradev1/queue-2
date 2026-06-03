# Phase 1: Fundacao Modular, Marca, Auth E Dupla - Context

**Gathered:** 2026-06-03T00:25:19-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the secure QUEUE/2 foundation: account creation, email verification, login, reset, session management, pairing by code, fixed duo membership, duo identity, basic profile/settings, the initial authenticated app shell, and brand-consistent feedback. It also establishes the modular monolith, database, migration, RLS, role, security and verification foundation required by the architecture and security contracts.

This phase does not implement catalog, library, discovery, play sessions, roulette, gamification, Hall da Moral, or duo reviews. Those later capabilities must remain compatible with the identity and duo model created here.

</domain>

<decisions>
## Implementation Decisions

### Cadastro e verificacao de email

- **D-01:** Cadastro inicial pede email, senha e nome de exibicao.
- **D-02:** Antes de verificar email, a pessoa fica restrita a tela de verificacao, com acoes para reenviar email, corrigir endereco e sair.
- **D-03:** Ao clicar no link de verificacao valido, a pessoa entra automaticamente e segue para pareamento.
- **D-04:** Correcao de email preserva o cadastro, invalida o link anterior e envia uma nova verificacao.
- **D-05:** Requisitos de senha aparecem como checklist progressivo enquanto a pessoa digita.
- **D-06:** Tentativa de login com email nao verificado bloqueia o acesso e abre a tela de verificacao com opcao de reenvio.
- **D-07:** Reenvio de verificacao usa confirmacao neutra com contagem regressiva para novo reenvio.
- **D-08:** Link expirado ou ja usado deve explicar o estado e oferecer novo envio, sem expor detalhes tecnicos.

### Ritual de pareamento

- **D-09:** Inserir um codigo valido forma a dupla imediatamente; o codigo funciona como convite direto.
- **D-10:** Codigo de pareamento expira em 24 horas e pode ser revogado antes do uso.
- **D-11:** Tela de codigo destaca codigo grande, acao de copiar e validade do convite.
- **D-12:** Sucesso de pareamento usa celebracao curta da marca, comunicando que a fila virou "nossa", com motion/toast especial moderado.
- **D-13:** Erros de codigo usam mensagens simples por estado: invalido, nao ativo por expiracao/revogacao, ou limite de tentativas. Nao revelar detalhes sensiveis.
- **D-14:** Usuario que ja esta em uma dupla nao pode criar ou entrar em outro codigo nesta fase; a UI explica que `/2` e fixo.
- **D-15:** Codigo revogado deve aparecer para quem tenta usa-lo como codigo nao mais ativo, sem diferenciar expirado de revogado.
- **D-16:** Tentativas de entrada por codigo usam limite persistente com aviso progressivo e espera antes de tentar novamente.
- **D-17:** Em corrida concorrente pelo mesmo codigo, quem perder ve que essa dupla acabou de ser formada.

### Identidade e configuracoes da dupla

- **D-18:** A dupla tem nome proprio obrigatorio.
- **D-19:** O nome da dupla e pedido depois que a dupla e formada; a primeira acao conjunta vira nomear a dupla.
- **D-20:** Tela da dupla mostra nome da dupla, os dois membros e a data de pareamento.
- **D-21:** Timezone da dupla e detectado pelo navegador e confirmado pela pessoa, pois resets e streaks dependem desse fuso.
- **D-22:** Preferencias compartilhadas de notificacoes e audio ficam em perfil/configuracoes, com padroes calmos. Push so deve ser pedido mais tarde, depois de uma acao que explique valor concreto.
- **D-23:** Qualquer membro pode editar nome da dupla e timezone, com registro/feedback simples; nao existe dono da dupla.
- **D-24:** Nomes de usuario e nome da dupla sao texto simples com limites curtos, sem HTML, markdown ou formatacao.
- **D-25:** Perfil individual da Fase 1 inclui nome de exibicao, sessoes ativas e sair.

### Primeiro momento autenticado

- **D-26:** Depois que a dupla e formada e nomeada, o app leva para um dashboard vazio orientado ao proximo passo.
- **D-27:** Dashboard inicial mostra a dupla, estado "fila ainda vazia" e um ritual em tres passos: descobrir, sortear, zerar.
- **D-28:** CTAs para capacidades futuras aparecem como proximos passos bloqueados com copy honesta, sem placeholders clicaveis.
- **D-29:** Marca aparece com energia contida: wordmark, `/2`, grain e ponteiro como acentos; sem espetaculo grande antes de jogos reais.
- **D-30:** Usuario verificado sem dupla e sempre levado a `/parear`; sem dupla nao ha app solo.
- **D-31:** Navegacao direta para rotas autenticadas sem dupla redireciona para `/parear` com retorno protegido quando a rota fizer sentido depois.
- **D-32:** O dashboard explica com copy curta que o proximo passo e descobrir jogos para a fila, sem criar botao falso.
- **D-33:** Tentativa de acessar feature bloqueada por fase/estado usa toast calmo e foco no proximo passo disponivel.
- **D-34:** Paginas autenticadas da Fase 1: `/parear`, dashboard inicial, perfil e dupla.
- **D-35:** Reviews em dupla ja estao planejadas para a Fase 7. A Fase 1 nao implementa reviews, mas perfil, dupla e identidade nao devem impedir reviews lado a lado no futuro.

### the agent's Discretion

- Definir microcopy exata, duracao de cooldown de reenvio, limite de caracteres de nomes e formulacao final das mensagens, desde que respeitem as decisoes acima, os contratos de seguranca e a linguagem brasileira do produto.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and phase scope

- `.planning/ROADMAP.md` - Phase 1 goal, requirements, success criteria and gates; Phase 7 confirms duo reviews in Hall/Stats/Lancamento.
- `.planning/REQUIREMENTS.md` - AUTH, DUO, BRND, ARCH, DATA, SEC, SAFE and META requirements mapped to Phase 1; HALL-01 through HALL-04 define future duo review behavior.
- `.planning/PROJECT.md` - Product intent, brand rules, initial domain tables, core duo principle and key decisions.
- `AGENTS.md` - Repository operating instructions, GSD workflow rule and project constraints.

### Binding contracts

- `.planning/ARCHITECTURE.md` - Modular monolith shape, public module entrypoints, dependency rules and enforcement expectations.
- `.planning/SECURITY.md` - Security/data contract, protected assets, trust boundaries, RLS, roles, integrity controls and Phase 1 verification gate.

### Stack and implementation baseline

- `.planning/research/STACK.md` - Required stack choices: Next.js App Router, pnpm/Turborepo, Better Auth self-hosted, Drizzle, Neon Postgres, Tailwind and testing tools.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- None yet. The repository currently contains planning artifacts and `AGENTS.md`, not application source.

### Established Patterns

- Greenfield implementation. Follow the planned repository shape from `.planning/ARCHITECTURE.md`: `apps/web`, `packages/db`, `packages/ui` and `packages/config`.
- Domain behavior must live behind module public entrypoints, not in routes, React components or infrastructure adapters.
- Security-sensitive behavior must be verified at both application and database layers.

### Integration Points

- Scaffold should create the Next.js app in `apps/web`.
- Auth platform code belongs under `apps/web/src/platform` and Better Auth tables belong to the `auth` schema.
- Duo domain behavior belongs under `apps/web/src/modules/duo` and authoritative tables under the `app` schema.
- Database schema, migrations, RLS, SQL functions and seeds belong in `packages/db`.
- Brand primitives, wordmark, mark, loading state and toast base belong in `packages/ui` without domain logic.

</code_context>

<specifics>
## Specific Ideas

- Pairing success should communicate that "a fila virou nossa" or equivalent QUEUE/2 copy.
- Initial dashboard state should orient the ritual with "descobrir, sortear, zerar".
- Empty authenticated dashboard can say that the next step is discovering games for the queue, without pretending catalog/library are already functional.
- Keep first authenticated brand moment intentional but restrained; high spectacle is reserved for later meaningful moments such as match, achievement, level-up, roulette and zerada.

</specifics>

<deferred>
## Deferred Ideas

- Duo reviews are not a new backlog item. They are already planned in Phase 7 through HALL-01, HALL-02, HALL-03 and HALL-04. Do not implement them in Phase 1; preserve compatibility for later side-by-side reviews and duo score.

</deferred>

---

*Phase: 1-Fundacao Modular, Marca, Auth E Dupla*
*Context gathered: 2026-06-03T00:25:19-03:00*
