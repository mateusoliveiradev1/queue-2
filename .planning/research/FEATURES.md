# Feature Research

**Domain:** Backlog e ritual colaborativo de jogos coop para duplas
**Researched:** 2026-06-03
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Cadastro, login e recuperacao | Produto publico precisa de acesso confiavel. | MEDIUM | Incluir verificacao de email, sessoes e UI propria. |
| Pareamento de dupla | Sem uma dupla o produto nao tem unidade de uso. | MEDIUM | Codigo deve ser seguro, expiravel e limitado a exatamente dois membros. |
| Catalogo pesquisavel | Usuarios precisam encontrar jogos conhecidos. | MEDIUM | RAWG e fonte inicial, com atribuicao e cache controlado. |
| Biblioteca por status | Backlog precisa ser organizado em estados claros. | MEDIUM | Wishlist, Jogando, Zerado, Dropado e Pausado. |
| Plataformas da dupla | Recomendacoes precisam respeitar o que ambos podem jogar. | MEDIUM | Intersecao deve ser visivel e editavel. |
| Detalhe do jogo | O usuario espera capa, metadados, progresso e historico. | MEDIUM | Deve reunir sessoes, notas, reviews e milestones. |
| Perfil e configuracoes | Usuarios precisam ajustar nome, preferencias e notificacoes. | LOW | Configuracoes de dupla e individuais devem ser separadas. |
| Responsividade e acessibilidade | Uso durante sessoes tende a ocorrer no celular. | HIGH | Mesmas capacidades, composicao adaptativa. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Tudo pertence a dupla | Troca competicao individual por compromisso compartilhado. | HIGH | Modelagem, copy e stats devem reforcar isso. |
| Cinco modos de descoberta | Reduz indecisao com experiencias adequadas a diferentes humores. | HIGH | Swipe, match live, surpresa, quiz e busca. |
| Roleta case opening | Transforma escolher o proximo jogo em ritual memoravel. | HIGH | Resultado autoritativo no servidor; animacao apenas revela. |
| Jogando Agora com ate tres jogos | Mantem foco sem impedir alternancia. | HIGH | Um principal, dois secundarios e reorder. |
| Sessoes live e offline | Liga o app ao ato real de jogar. | HIGH | Cronometro por timestamp, confirmacao dupla e timeline. |
| Gamificacao coletiva profunda | Recompensa consistencia sem competir internamente. | HIGH | XP, niveis, conquistas, quests, streaks e raridades. |
| Hall da Moral | Converte backlog em memoria compartilhada. | HIGH | Estante, replay, reviews e stats derivados. |
| Identidade QUEUE/2 | Faz o produto parecer ritual de jogo, nao planilha ou SaaS. | HIGH | Brutalismo editorial, capas como cor e espetaculo pontual. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Modo solo | Aumenta publico aparente. | Enfraquece `/2`, complica dados e cria incentivos individuais. | Manter exatamente dois jogadores. |
| Leaderboard publico | Parece aumentar engajamento. | Torna a experiencia competitiva e contradiz o produto. | Stats colaborativos privados da dupla. |
| Chat e voice in-app | Centraliza a comunicacao. | Duplica ferramentas existentes e amplia muito o escopo. | Push e confirmacoes focadas no ritual. |
| Real-time em tudo | Parece mais moderno. | Aumenta custo e complexidade para estados que toleram revalidacao. | Real-time apenas onde muda a experiencia. |
| Importacao Steam no v1 | Facilita bootstrap de backlog. | Exige integracao, matching e tratamento de dados externos antes do ritual estar pronto. | Busca, descoberta e wishlist manuais no v1. |
| Disponibilidade Game Pass tratada como verdade em tempo real | Melhora filtros. | Nao ha API publica oficial identificada e o catalogo muda. | Dados curados com fonte, data de verificacao e aviso de frescor. |

## Feature Dependencies

```text
Autenticacao
  -> Pareamento de dupla
     -> Biblioteca e acoes por usuario
        -> Matches e descoberta
        -> Jogando Agora e sessoes
           -> XP, conquistas, quests e streaks
              -> Hall da Moral e stats

Catalogo RAWG
  -> Busca e detalhe do jogo
  -> Descoberta
  -> Roleta

Biblioteca + raridade + XP ledger
  -> Roleta com pity, boost e historico

Push opt-in + jobs agendados
  -> Match live
  -> Lembrete de sessao
```

### Dependency Notes

- **Pareamento requer autenticacao:** membership e autorizacao precisam de uma identidade persistente.
- **Descoberta requer catalogo e acoes:** match score depende dos jogos e das respostas individuais.
- **Gamificacao requer eventos autoritativos:** premios nao podem depender apenas de cliques no cliente.
- **Hall requer historico confiavel:** stats e replay devem ser derivados de sessoes, reviews e eventos.
- **Roleta requer economia pronta:** pity, boost e XP precisam ser transacionais e auditaveis.

## MVP Definition

O usuario definiu que todo o Plano Final v7 pertence a v1. Portanto, "MVP" aqui significa uma ordem de construcao interna, nao um corte de escopo de lancamento.

### Launch With (v1)

- [ ] Identidade, auth, pareamento e seguranca por dupla.
- [ ] Catalogo, biblioteca, busca, detalhe e plataformas comuns.
- [ ] Cinco modos de descoberta e matches.
- [ ] Jogando Agora, sessoes, progresso, notas e agendamento.
- [ ] XP, niveis, conquistas, quests, streaks e raridades.
- [ ] Roleta completa com pity, boost, audio e lock principal.
- [ ] Hall da Moral, reviews, stats, landing, SEO e PWA.

### Add After Validation (v1.x)

- [ ] Ajustes de balanceamento da economia - baseados em dados reais de uso.
- [ ] Novas temporadas, conquistas e quests - sem alterar o nucleo tecnico.
- [ ] Melhorias do recomendador - depois de haver interacoes suficientes.

### Future Consideration (v2+)

- [ ] Importacao de perfil Steam - acelera onboarding, mas nao valida o ritual central.
- [ ] Aplicativo nativo - considerar somente se PWA nao atender uso durante sessoes.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Auth e pareamento seguro | HIGH | HIGH | P1 |
| Catalogo e biblioteca | HIGH | MEDIUM | P1 |
| Descoberta e matches | HIGH | HIGH | P1 |
| Jogando Agora e sessoes | HIGH | HIGH | P1 |
| Gamificacao coletiva | HIGH | HIGH | P1 |
| Roleta case opening | HIGH | HIGH | P1 |
| Hall, stats e reviews | HIGH | HIGH | P1 |
| Steam import | MEDIUM | HIGH | P3 |

## Competitor Pattern Analysis

| Pattern | Backlog trackers | Recomendadores | QUEUE/2 Approach |
|---------|------------------|----------------|------------------|
| Unidade de progresso | Normalmente individual. | Preferencias individuais. | Uma dupla fixa com progresso compartilhado. |
| Escolha do proximo jogo | Lista ou filtro. | Score e ranking. | Match, surpresa, quiz e roleta ritualizada. |
| Registro de jogo | Status e nota. | Pouco historico. | Sessoes, momentos, milestones e replay. |
| Gamificacao | Streak ou badges individuais. | Rara. | Economia coletiva ligada ao ato real de jogar. |
| Visual | Utilitario ou gamer generico. | Cards de catalogo. | Brutalismo editorial com capas como fonte de cor. |

## Sources

- `.planning/PROJECT.md` - visao completa e decisoes do usuario.
- https://rawg.io/apidocs - capacidades, playtime medio, atribuicao e limites de uso.
- https://nextjs.org/docs/app/guides/progressive-web-apps - PWA e push web.
- https://developer.mozilla.org/en-US/docs/Web/API/Push_API - modelo de permissao e push.

---
*Feature research for: QUEUE/2*
*Researched: 2026-06-03*
