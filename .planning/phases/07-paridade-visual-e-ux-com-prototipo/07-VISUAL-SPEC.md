# Phase 7 Visual Spec: Paridade Visual e UX com Prototipo

## Verdict

O prototipo Lovable tem uma direcao visual mais forte que a UI atual: menos dashboard SaaS, mais produto editorial/brutalist, com bastante respiro, hierarquia tipografica forte, acento lime e composicoes simples. A Phase 7 deve aproximar o produto dessa direcao sem remover funcionalidades ja entregues.

## Principles

- **Shell horizontal**: rotas internas devem usar navegacao superior, estado ativo claro e marca QUEUE/2 como primeiro sinal.
- **Composicao centrada**: conteudo principal em max-width controlado, muito espaco negativo e paineis de borda fina.
- **Tipografia como identidade**: headings grandes, uppercase, peso alto, slash lime e labels mono/condensados.
- **Acento lime disciplinado**: verde aparece em logo, nav ativa, CTAs, slashes, numeros importantes e estados selecionados.
- **Sem visual SaaS generico**: reduzir cards arredondados, gradientes decorativos, dashboards densos demais e hero com copy explicativa demais.
- **Estados vazios memoraveis**: biblioteca, roleta e hall precisam de paineis vazios fortes, com uma acao clara.
- **Acessibilidade preservada**: contraste, foco, labels, reduced motion, touch targets e texto sem overflow continuam gates de release.

## Route Targets

### Public Landing

- Primeiro viewport deve lembrar o print do prototipo: topo minimalista, QUEUE/2 gigante, tagline curta e CTAs diretos.
- A secao "tres passos" deve aparecer logo abaixo da dobra, sem virar landing longa de SaaS.
- A home publica deve priorizar marca e ritual, nao explicar todas as features.

### Auth, Cadastro e Pareamento

- Login/cadastro devem ser compactos e diretos, com card central, tabs "Entrar" e "Criar conta" quando fizer sentido.
- Remover excesso de verticalidade das telas atuais.
- Google, email/senha, voltar e mensagens de erro devem permanecer claros e acessiveis.
- Pareamento deve manter o mesmo visual compacto, com codigo de dupla em destaque.

### Authenticated Shell

- Trocar a sensacao de sidebar/app administrativo por topo horizontal com: Home, Biblioteca, Descobrir, Roleta, Desafios, Hall e Dupla.
- Perfil e sair ficam no canto direito.
- Mobile precisa ter equivalente navegavel sem esconder as rotas principais ou criar overlap.

### Home `/app`

- Hero interno com status pequeno de LV/XP/STREAK, empty state forte e CTAs Descobrir/Roleta/Biblioteca.
- Tiles de resumo devem ser retangulares, baixos, com borda fina e labels mono.

### Biblioteca `/app/biblioteca`

- Tabs compactas por status no topo.
- Empty state central "NADA AQUI AINDA /" com CTA Descobrir.
- Quando houver jogos, manter funcionalidade de filtros/status, mas aplicar a linguagem visual mais seca do prototipo.

### Descobrir `/app/descobrir`

- Card de jogo mais dominante, imagem maior e acoes em linha abaixo: Pular, Talvez/Agora nao e Quero.
- Metadados devem ficar contidos e legiveis, sem competir com a capa.
- Reduced motion precisa continuar equivalente.

### Roleta `/app/roleta`

- Estado vazio central no estilo "BACKLOG VAZIO /" com CTA "Ir descobrir".
- Header secundario deve mostrar contexto da roleta e pity de forma discreta.
- A animacao da roleta continua sendo a experiencia premium, mas a moldura visual deve combinar com o prototipo.

### Desafios `/app/desafios`

- Grid de cards retangulares em duas colunas no desktop, progress bars discretas e XP em lime.
- Mobile deve virar uma coluna sem texto espremido.

### Hall `/app/hall`

- Empty state "ESTANTE VAZIA / POR ENQUANTO" em painel largo.
- Quando Phase 8 implementar conteudo final, manter essa direcao visual.

### Dupla `/app/dupla`

- Codigo da dupla em destaque, avatares compactos e grade de stats com numeros grandes.
- Stats devem reforcar progresso coletivo, nunca comparacao individual.

### Perfil `/app/perfil`

- Formulario compacto, alinhado e direto.
- Campos longos como avatar URL precisam evitar overflow horizontal.

## Non-Goals

- Nao alterar schema, migrations, RLS, autorizacao ou regras de dominio por estetica.
- Nao remover funcionalidades ja entregues em Phase 1-6 para imitar print vazio.
- Nao sacrificar acessibilidade para reproduzir contraste, fonte ou espacamento do prototipo.
- Nao transformar a UI em arcade neon generico; o prototipo e a referencia, nao uma desculpa para excesso visual.

## Acceptance Evidence

- Screenshots Playwright de desktop e mobile para landing, login, cadastro, `/app`, `/app/biblioteca`, `/app/descobrir`, `/app/roleta`, `/app/desafios`, `/app/dupla` e `/app/perfil`.
- Axe ou auditoria equivalente nas rotas publicas e nas principais rotas autenticadas.
- Verificacao de reduced motion em Descobrir e Roleta.
- Checagem de texto sem overflow, foco visivel, touch targets e ausencia de sobreposicao em mobile.
- Gates existentes de Phase 6 continuam verdes depois do redesign.
