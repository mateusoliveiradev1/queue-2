import type { GamificationRarity } from "./gamification-policy";

export const ACHIEVEMENT_GROUPS = [
  "story",
  "coop-sincronia",
  "compromisso",
  "descoberta",
  "streak",
  "roleta",
  "comedia"
] as const;

export const ACHIEVEMENT_GROUP_LABELS: Record<AchievementGroup, string> = {
  story: "Story",
  "coop-sincronia": "Coop-Sincronia",
  compromisso: "Compromisso",
  descoberta: "Descoberta",
  streak: "Streak",
  roleta: "Roleta",
  comedia: "Comedia"
};

export type AchievementGroup = (typeof ACHIEVEMENT_GROUPS)[number];
export type AchievementVisibility = "visible" | "hidden";

export type AchievementSeed = {
  slug: string;
  group: AchievementGroup;
  rarity: GamificationRarity;
  visibility: AchievementVisibility;
  title: string;
  description: string;
  iconKey: string;
  predicateKey: string;
};

export const ACHIEVEMENT_CATALOG_VERSION = "queue2-achievements-v1";

export const ACHIEVEMENT_CATALOG = [
  seed("primeiro-save", "story", "common", "visible", "Primeiro save", "A primeira sessao confirmada entrou na historia da dupla.", "badge-story-save", "confirmed-session-count:1"),
  seed("capitulo-na-conta", "story", "common", "visible", "Capitulo na conta", "Um capitulo manual foi concluido sem pressa e sem solo.", "badge-story-chapter", "completed-chapter-count:1"),
  seed("campanha-acordada", "story", "rare", "visible", "Campanha acordada", "Tres sessoes confirmadas no mesmo jogo mantiveram a fila viva.", "badge-story-campaign", "game-session-count:3"),
  seed("meio-caminho", "story", "rare", "visible", "Meio caminho", "A dupla passou de metade do tempo estimado com fonte registrada.", "badge-story-half", "estimated-time-ratio:0.5"),
  seed("final-verdadeiro", "story", "epic", "visible", "Final verdadeiro", "Um Zerado confirmado pelos dois virou marco coletivo.", "badge-story-clear", "terminal-zerado-count:1"),
  seed("trilogia-fechada", "story", "legendary", "visible", "Trilogia fechada", "Tres jogos Zerados pela dupla no mesmo ciclo de parceria.", "badge-story-trilogy", "terminal-zerado-count:3"),
  seed("sem-pular-cutscene", "story", "rare", "hidden", "Sem pular cutscene", "A dupla ficou tempo suficiente para o jogo respirar.", "badge-story-cutscene", "long-session-count:1"),
  seed("mapa-completo", "story", "epic", "visible", "Mapa completo", "Capitulos, tempo e porcentagem caminharam juntos no mesmo jogo.", "badge-story-map", "progress-layer-count:3"),
  seed("controle-passado", "coop-sincronia", "common", "visible", "Controle passado", "Os dois confirmaram o mesmo efeito sem duplicar recompensa.", "badge-sync-control", "double-confirmation-count:1"),
  seed("timing-de-revive", "coop-sincronia", "rare", "visible", "Timing de revive", "A dupla voltou de uma sessao dificil e manteve o ritual.", "badge-sync-revive", "comeback-session-count:1"),
  seed("call-sem-call", "coop-sincronia", "rare", "visible", "Call sem call", "Acoes seguidas indicaram sintonia real, nao sorte.", "badge-sync-call", "same-day-actions:4"),
  seed("dois-controles-um-plano", "coop-sincronia", "epic", "visible", "Dois controles, um plano", "Principal, sessao e progresso ficaram alinhados no mesmo dia.", "badge-sync-plan", "aligned-play-day:1"),
  seed("boss-dividido", "coop-sincronia", "rare", "visible", "Boss dividido", "Um marco de boss ou capitulo foi vencido em cooperacao.", "badge-sync-boss", "boss-marker-count:1"),
  seed("sem-fogo-amigo", "coop-sincronia", "common", "hidden", "Sem fogo amigo", "A fila reconheceu uma sequencia limpa da dupla.", "badge-sync-clean", "clean-streak:3"),
  seed("dupla-afinada", "coop-sincronia", "epic", "visible", "Dupla afinada", "Sete dias de fatos confirmados provaram consistencia compartilhada.", "badge-sync-tuned", "streak-days:7"),
  seed("pacto-da-fila", "compromisso", "common", "visible", "Pacto da fila", "Uma sessao foi agendada com horario e timezone da dupla.", "badge-commit-schedule", "scheduled-session-count:1"),
  seed("presenca-confirmada", "compromisso", "common", "visible", "Presenca confirmada", "Os dois confirmaram presenca em uma sessao marcada.", "badge-commit-attendance", "attendance-confirmation-count:1"),
  seed("sabado-reservado", "compromisso", "rare", "visible", "Sabado reservado", "A dupla transformou plano em sessao real no fim de semana.", "badge-commit-weekend", "weekend-session-count:1"),
  seed("sem-deixar-cair", "compromisso", "rare", "visible", "Sem deixar cair", "Uma semana fechou com pelo menos tres fatos reais.", "badge-commit-week", "weekly-confirmed-facts:3"),
  seed("mesmo-horario", "compromisso", "epic", "hidden", "Mesmo horario", "A rotina encaixou sem virar obrigacao.", "badge-commit-routine", "same-hour-sessions:3"),
  seed("fila-respeitada", "compromisso", "common", "visible", "Fila respeitada", "Um jogo foi pausado ou retomado sem quebrar a organizacao.", "badge-commit-queue", "library-maintenance-count:1"),
  seed("maratona-combinada", "compromisso", "epic", "visible", "Maratona combinada", "Uma sessao longa aconteceu com confirmacao dos dois.", "badge-commit-marathon", "marathon-session-count:1"),
  seed("radar-ligado", "descoberta", "common", "visible", "Radar ligado", "O primeiro match da dupla saiu de uma decisao real.", "badge-discovery-radar", "discovery-match-count:1"),
  seed("quero-jogar-tambem", "descoberta", "common", "visible", "Quero jogar tambem", "Os dois quiseram o mesmo jogo sem empurrar escolha solo.", "badge-discovery-want", "mutual-want-count:1"),
  seed("mood-certo", "descoberta", "rare", "visible", "Mood certo", "Uma recomendacao por quiz virou match da dupla.", "badge-discovery-mood", "quiz-match-count:1"),
  seed("surpresa-boa", "descoberta", "rare", "visible", "Surpresa boa", "Um modo surpresa encontrou algo que os dois topariam.", "badge-discovery-surprise", "surprise-match-count:1"),
  seed("nao-era-obvio", "descoberta", "epic", "hidden", "Nao era obvio", "A dupla aprovou um jogo fora do padrao recente.", "badge-discovery-unusual", "unexpected-match-count:1"),
  seed("biblioteca-crescendo", "descoberta", "common", "visible", "Biblioteca crescendo", "Matches e wishlist alimentaram a fila real da dupla.", "badge-discovery-library", "library-growth-count:5"),
  seed("curadoria-de-dois", "descoberta", "epic", "visible", "Curadoria de dois", "Vinte decisoes criaram sinal coletivo confiavel.", "badge-discovery-curation", "duo-decision-count:20"),
  seed("chama-inicial", "streak", "common", "visible", "Chama inicial", "Dois duo-days seguidos tiveram fatos confirmados.", "badge-streak-flame", "streak-days:2"),
  seed("ate-as-quatro", "streak", "rare", "visible", "Ate as 04:00", "A dupla salvou um duo-day dentro do backup planejado.", "badge-streak-cutoff", "duo-day-backup-count:1"),
  seed("freeze-na-manga", "streak", "rare", "visible", "Freeze na manga", "Um Streak Freeze foi conquistado por nivel da dupla.", "badge-streak-freeze-earned", "freeze-earned-count:1"),
  seed("gelo-sem-drama", "streak", "rare", "visible", "Gelo sem drama", "Um freeze segurou a sequencia sem culpa e sem bronca.", "badge-streak-freeze-used", "freeze-consumed-count:1"),
  seed("semana-acesa", "streak", "epic", "visible", "Semana acesa", "Sete duo-days seguidos de atividade confirmada.", "badge-streak-week", "streak-days:7"),
  seed("fogo-calmo", "streak", "epic", "hidden", "Fogo calmo", "A sequencia ficou forte sem virar cobranca.", "badge-streak-calm", "streak-without-pressure:1"),
  seed("longo-prazo", "streak", "legendary", "visible", "Longo prazo", "Trinta duo-days de consistencia compartilhada.", "badge-streak-long", "streak-days:30"),
  seed("primeiro-desafio", "compromisso", "common", "visible", "Primeiro desafio", "Uma quest semanal foi concluida pela dupla.", "badge-quest-first", "quest-complete-count:1"),
  seed("semana-fechada", "compromisso", "rare", "visible", "Semana fechada", "As tres quests semanais foram resolvidas no mesmo ciclo.", "badge-quest-week", "weekly-quest-complete-count:3"),
  seed("mes-da-dupla", "compromisso", "epic", "visible", "Mes da dupla", "A quest mensal foi concluida sem pressa e com XP coletivo.", "badge-quest-month", "monthly-quest-complete-count:1"),
  seed("selo-sazonal", "compromisso", "epic", "visible", "Selo sazonal", "Um desafio sazonal deixou marca permanente.", "badge-quest-season", "seasonal-quest-complete-count:1"),
  seed("spooky-coop", "comedia", "rare", "visible", "Spooky coop", "A dupla encarou uma temporada assustadora sem virar solo.", "badge-season-spooky", "seasonal-spooky-complete:1"),
  seed("awards-em-casa", "comedia", "rare", "visible", "Awards em casa", "A temporada de premiacoes virou ritual da dupla.", "badge-season-awards", "seasonal-awards-complete:1"),
  seed("aniversario-da-fila", "comedia", "epic", "visible", "Aniversario da fila", "A parceria comemorou mais um ciclo de backlog vivo.", "badge-season-anniversary", "seasonal-anniversary-complete:1"),
  seed("ponteiro-curioso", "roleta", "common", "visible", "Ponteiro curioso", "A roleta entrou na historia sem dominar a economia.", "badge-roulette-pointer", "roulette-view-count:1"),
  seed("quase-epico", "roleta", "rare", "hidden", "Quase epico", "A fila guardou tensao para a proxima escolha.", "badge-roulette-almost", "roulette-near-epic-count:1"),
  seed("case-de-respeito", "roleta", "epic", "visible", "Case de respeito", "Um resultado raro foi tratado como decisao da dupla.", "badge-roulette-case", "roulette-rare-result-count:1"),
  seed("sem-tilt", "comedia", "common", "visible", "Sem tilt", "Um Dropado confirmado nao virou punicao nem vergonha.", "badge-comedy-no-tilt", "terminal-dropado-count:1"),
  seed("mais-um-so", "comedia", "rare", "hidden", "Mais um so", "A madrugada tentou virar campanha, e a dupla sobreviveu.", "badge-comedy-one-more", "late-session-chain:1"),
  seed("chefao-do-sofa", "comedia", "epic", "visible", "Chefao do sofa", "O sofa virou arena e a dupla segurou a onda.", "badge-comedy-sofa-boss", "couch-boss-count:1"),
  seed("lendas-do-coop", "story", "legendary", "visible", "Lendas do Coop", "A dupla chegou ao topo sem transformar parceria em disputa.", "badge-story-legend", "level:50")
] as const satisfies readonly AchievementSeed[];

export function getVisibleAchievementSeeds(): readonly AchievementSeed[] {
  return ACHIEVEMENT_CATALOG.filter((achievement) => achievement.visibility === "visible");
}

export function getAchievementBySlug(slug: string): AchievementSeed | null {
  return ACHIEVEMENT_CATALOG.find((achievement) => achievement.slug === slug) ?? null;
}

function seed(
  slug: string,
  group: AchievementGroup,
  rarity: GamificationRarity,
  visibility: AchievementVisibility,
  title: string,
  description: string,
  iconKey: string,
  predicateKey: string
): AchievementSeed {
  return {
    slug,
    group,
    rarity,
    visibility,
    title,
    description,
    iconKey,
    predicateKey
  };
}
