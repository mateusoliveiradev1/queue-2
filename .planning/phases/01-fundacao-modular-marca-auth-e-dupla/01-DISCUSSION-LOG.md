# Phase 1: Fundacao Modular, Marca, Auth E Dupla - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md; this log preserves the alternatives considered.

**Date:** 2026-06-03T00:25:19-03:00
**Phase:** 1-Fundacao Modular, Marca, Auth E Dupla
**Areas discussed:** Cadastro e verificacao de email, Ritual de pareamento, Identidade e configuracoes da dupla, Primeiro momento apos formar a dupla

---

## Cadastro e verificacao de email

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Dados do cadastro inicial | Email/senha/nome; apenas email/senha; nome apos cadastro | Email, senha e nome de exibicao |
| Acesso antes de verificar email | Somente verificacao; explorar app sem parear; parear sem usar dados | Somente tela de verificacao |
| Depois do link de verificacao | Entrar e ir para pareamento; pedir login; entrar so no mesmo navegador | Entrar automaticamente e seguir para pareamento |
| Corrigir email digitado errado | Editar e reenviar; recomecar cadastro; corrigir apos login | Editar email e reenviar |
| Requisitos de senha | Checklist progressivo; texto curto; somente apos falhar | Checklist progressivo |
| Login sem email verificado | Bloquear e abrir verificacao; erro no login; reenviar automaticamente | Bloquear e abrir tela de verificacao |
| Feedback de reenvio | Confirmacao com contagem regressiva; confirmacao simples; alto impacto | Confirmacao neutra com contagem regressiva |
| Link expirado/usado | Explicar estado e oferecer novo envio; redirecionar para login; erro generico | Explicar estado e oferecer novo envio |

**Notes:** Usuario pediu recomendacao para correcao de email; recomendacao travada foi editar email e reenviar, preservando cadastro e invalidando o link anterior.

---

## Ritual de pareamento

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Como formar dupla com codigo valido | Formar imediatamente; exigir confirmacao do criador; confirmar por quem entra | Formar imediatamente |
| Validade do codigo | 24h e revogavel; 1h e revogavel; ativo ate revogar | 24h e revogavel |
| Tela de codigo criado | Codigo/copiar/validade; instrucoes longas; QR code | Codigo grande, copiar e validade |
| Feedback de sucesso | Celebracao curta; confirmacao utilitaria; tela completa | Celebracao curta da marca |
| Erros de codigo | Mensagens simples por estado; erro generico; mensagens especificas | Mensagens simples por estado |
| Usuario ja em dupla | Bloquear e explicar `/2`; permitir sair/criar outra; multiplos convites | Bloquear e explicar que `/2` e fixo |
| Codigo revogado | Codigo nao ativo; dizer revogado; tratar como invalido | Mostrar que codigo nao esta mais ativo |
| Limite de tentativas | Persistente com aviso; silencioso; CAPTCHA | Limite persistente com aviso progressivo |
| Corrida concorrente | Dupla acabou de ser formada; codigo nao disponivel; nova dupla automatica | "Essa dupla acabou de ser formada" |

**Notes:** Pareamento por codigo e um convite direto. Mudanca de dupla fica fora desta fase.

---

## Identidade e configuracoes da dupla

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Nome proprio da dupla | Obrigatorio; opcional; usar nomes dos membros | Nome da dupla obrigatorio |
| Momento de pedir nome | Depois de formar dupla; ao criar codigo; durante cadastro | Depois que a dupla e formada |
| Tela da dupla | Nome/membros/data; nome/stats; apenas nome | Nome da dupla, dois membros e data |
| Timezone | Detectar e confirmar; campo manual; UTC escondido | Detectar navegador e confirmar |
| Preferencias de notificacao/audio | Onboarding; perfil/configuracoes; quando feature aparecer | Perfil/configuracoes |
| Quem edita nome/timezone | Qualquer membro; criador; dupla confirmacao | Qualquer membro |
| Formato de nomes | Texto simples curto; emojis/simbolos amplos; formatacao leve | Texto simples com limites curtos |
| Perfil individual | Nome/sessoes ativas/sair; nome/sair; perfil completo | Nome de exibicao, sessoes ativas e sair |

**Notes:** Usuario pediu recomendacao para preferencias e permissao de edicao. Decisoes recomendadas travadas: preferencias fora do onboarding; qualquer membro edita configuracoes simples. Usuario tambem pediu que opcoes recomendadas fossem marcadas nas perguntas seguintes.

---

## Primeiro momento apos formar a dupla

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Destino apos dupla nomeada | Dashboard vazio orientado; pagina da dupla; biblioteca em breve | Dashboard vazio orientado |
| Conteudo do dashboard inicial | Ritual em 3 passos; boas-vindas simples; cards mockados | Estado zero com ritual em 3 passos |
| CTAs de features futuras | Bloqueados com copy honesta; esconder; placeholders clicaveis | Proximos passos bloqueados com copy honesta |
| Papel da marca | Energia contida; hero forte; interface neutra | Marca presente, energia contida |
| Usuario verificado sem dupla | Forcar `/parear`; navegar app vazio; dashboard pessoal | Forcar `/parear` |
| Rota autenticada sem dupla | Redirecionar a `/parear`; erro de acesso; rota sem dados | Redirecionar para `/parear` com retorno protegido |
| Como indicar catalogo/biblioteca futuros | Copy curta no estado zero; banner roadmap; nao mencionar | Copy curta no estado zero |
| Feature bloqueada | Toast calmo e proximo passo; 404; modal em breve | Toast calmo e foco no proximo passo |
| Paginas autenticadas da Fase 1 | Perfil e Dupla; somente Perfil; Perfil/Dupla/Biblioteca vazia | Perfil e Dupla |

**Notes:** Usuario perguntou se reviews em dupla estavam planejadas. Confirmado: elas pertencem a Fase 7 (HALL-01 a HALL-04). A decisao registrada e nao implementar reviews na Fase 1, mas preservar compatibilidade.

---

## the agent's Discretion

- Microcopy final, tempos exatos de cooldown, limites de caracteres e detalhes visuais finos permanecem a criterio da implementacao, desde que respeitem CONTEXT.md e os contratos vinculantes.

## Deferred Ideas

- Reviews em dupla: ja planejadas na Fase 7, nao sao backlog novo. Fora do escopo da Fase 1.
