import "server-only";

export type CatalogLocalizationQualityCheck = {
  coop_facts_checked: boolean;
  spoilers_avoided: boolean;
  facts_not_invented: boolean;
  natural_pt_br: boolean;
  queue2_tone_controlled: boolean;
};

export type PublishedCatalogLocalizationSeed = {
  slug: string;
  locale: "pt-BR";
  version: number;
  status: "published";
  description: string;
  source: "queue2-curation";
  sourceUrl: null;
  rawSourceHash: null;
  provenance: {
    kind: "phase-2-polish";
    summary: string;
  };
  authorKind: "seed";
  authorId: string;
  reviewerKind: "operator";
  reviewerId: string;
  reviewNotes: string;
  qualityCheck: CatalogLocalizationQualityCheck;
  reviewedAt: Date;
  publishedAt: Date;
};

const reviewedAt = new Date("2026-06-03T20:30:00.000Z");

const defaultQualityCheck: CatalogLocalizationQualityCheck = {
  coop_facts_checked: true,
  spoilers_avoided: true,
  facts_not_invented: true,
  natural_pt_br: true,
  queue2_tone_controlled: true
};

export const publishedCatalogLocalizationSeeds: PublishedCatalogLocalizationSeed[] = [
  localizationSeed(
    "a-way-out-2018",
    "Dois prisioneiros precisam cooperar para escapar, improvisar planos e lidar com as consequencias da fuga. A campanha foi criada para duas pessoas e alterna acao, stealth, direcao e pequenas decisoes de ritmo."
  ),
  localizationSeed(
    "castle-crashers",
    "Um beat 'em up cooperativo leve, caotico e direto, feito para avancar fase a fase com a dupla dividindo pancadaria, magias e piadas visuais. Funciona bem quando a fila pede algo facil de entrar e dificil de levar a serio demais."
  ),
  localizationSeed(
    "children-of-morta",
    "A familia Bergson enfrenta uma ameaca crescente em uma aventura de acao com progressao compartilhada. A dupla alterna herois, combina estilos e avanca por tentativas curtas com clima de fantasia sombria."
  ),
  localizationSeed(
    "cuphead",
    "Cuphead mistura chefes exigentes, plataforma e visual de animacao classica em uma campanha cooperativa intensa. A dupla precisa coordenar esquivas, reviver no susto e aceitar que algumas fases vao pedir repeticao."
  ),
  localizationSeed(
    "it-takes-two",
    "May e Cody sao transformados em bonecos e precisam cooperar para atravessar mundos cheios de mecanicas novas. Cada trecho da campanha muda a forma de jogar, entao a dupla quase sempre precisa conversar, testar e rir do erro junto."
  ),
  localizationSeed(
    "lovers-in-a-dangerous-spacetime",
    "A dupla pilota uma nave cheia de estacoes, correndo entre armas, escudos e motor para sobreviver ao caos. E um coop de comunicacao constante, em que a graca esta em dividir tarefas sob pressao."
  ),
  localizationSeed(
    "nobody-saves-the-world",
    "Uma aventura de acao em que a dupla desbloqueia formas diferentes e combina habilidades para cumprir missoes. O ritmo favorece experimentar builds, limpar masmorras e evoluir personagens sem pressa."
  ),
  localizationSeed(
    "portal-2",
    "A campanha cooperativa de Portal 2 coloca dois robos resolvendo salas de teste feitas para comunicacao precisa. Portais, timing e observacao viram o centro da experiencia, com puzzles que raramente funcionam no silencio."
  ),
  localizationSeed(
    "sackboy-a-big-adventure",
    "Uma aventura de plataforma colorida e acessivel, boa para sessoes leves em dupla. As fases misturam colecionaveis, desafios de precisao e momentos cooperativos sem exigir compromisso pesado."
  ),
  localizationSeed(
    "trine-4-the-nightmare-prince",
    "Tres herois com habilidades complementares atravessam cenarios de fantasia cheios de puzzles fisicos e combate leve. Em dupla, a diversao esta em improvisar solucoes e quebrar um pouco a logica do cenario."
  ),
  localizationSeed(
    "unravel-two",
    "Dois personagens ligados por um fio atravessam fases de plataforma e puzzles com ritmo contemplativo. A experiencia valoriza coordenacao, cuidado nos saltos e pequenas descobertas compartilhadas."
  ),
  localizationSeed(
    "we-were-here-together",
    "Um jogo de puzzles assimetricos em que cada pessoa ve partes diferentes da solucao. A dupla precisa descrever bem o que enxerga, confiar no outro lado e transformar conversa em progresso."
  )
];

export function findPublishedCatalogLocalizationSeed(
  slug: string
): PublishedCatalogLocalizationSeed | null {
  return publishedCatalogLocalizationSeeds.find((seed) => seed.slug === slug) ?? null;
}

function localizationSeed(
  slug: string,
  description: string
): PublishedCatalogLocalizationSeed {
  return {
    slug,
    locale: "pt-BR",
    version: 1,
    status: "published",
    description,
    source: "queue2-curation",
    sourceUrl: null,
    rawSourceHash: null,
    provenance: {
      kind: "phase-2-polish",
      summary:
        ".planning/quick/260603-r9i-polir-catalogo-da-fase-2-corrigir-cards-/260603-r9i-SUMMARY.md"
    },
    authorKind: "seed",
    authorId: "queue2-phase-2-polish",
    reviewerKind: "operator",
    reviewerId: "queue2-curation",
    reviewNotes: "Seed PT-BR copy migrated from accepted Phase 2 catalog polish.",
    qualityCheck: defaultQualityCheck,
    reviewedAt,
    publishedAt: reviewedAt
  };
}
