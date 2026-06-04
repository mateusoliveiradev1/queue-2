#!/usr/bin/env node
import { createRuntimePool } from "../packages/db/src/runtime-pool.ts";

type LocalizationSeed = {
  slug: string;
  description: string;
};

type AvailabilitySeed = {
  slug: string;
  type: "game-pass";
  platformKey: "xbox";
  source: "Xbox Store" | "Xbox Store / EA Play";
  sourceUrl: string;
  checkedAt: Date;
};

const reviewedAt = new Date("2026-06-03T20:30:00.000Z");
const availabilityCheckedAt = new Date("2026-06-03T21:25:00.000-03:00");
const qualityCheck = {
  coop_facts_checked: true,
  spoilers_avoided: true,
  facts_not_invented: true,
  natural_pt_br: true,
  queue2_tone_controlled: true
};
const provenance = {
  kind: "phase-2-polish",
  summary:
    ".planning/quick/260603-r9i-polir-catalogo-da-fase-2-corrigir-cards-/260603-r9i-SUMMARY.md"
};

const localizationSeeds: LocalizationSeed[] = [
  {
    slug: "a-way-out-2018",
    description:
      "Dois prisioneiros precisam cooperar para escapar, improvisar planos e lidar com as consequencias da fuga. A campanha foi criada para duas pessoas e alterna acao, stealth, direcao e pequenas decisoes de ritmo."
  },
  {
    slug: "castle-crashers",
    description:
      "Um beat 'em up cooperativo leve, caotico e direto, feito para avancar fase a fase com a dupla dividindo pancadaria, magias e piadas visuais. Funciona bem quando a fila pede algo facil de entrar e dificil de levar a serio demais."
  },
  {
    slug: "children-of-morta",
    description:
      "A familia Bergson enfrenta uma ameaca crescente em uma aventura de acao com progressao compartilhada. A dupla alterna herois, combina estilos e avanca por tentativas curtas com clima de fantasia sombria."
  },
  {
    slug: "cuphead",
    description:
      "Cuphead mistura chefes exigentes, plataforma e visual de animacao classica em uma campanha cooperativa intensa. A dupla precisa coordenar esquivas, reviver no susto e aceitar que algumas fases vao pedir repeticao."
  },
  {
    slug: "it-takes-two-2",
    description:
      "May e Cody sao transformados em bonecos e precisam cooperar para atravessar mundos cheios de mecanicas novas. Cada trecho da campanha muda a forma de jogar, entao a dupla quase sempre precisa conversar, testar e rir do erro junto."
  },
  {
    slug: "lovers-in-a-dangerous-spacetime",
    description:
      "A dupla pilota uma nave cheia de estacoes, correndo entre armas, escudos e motor para sobreviver ao caos. E um coop de comunicacao constante, em que a graca esta em dividir tarefas sob pressao."
  },
  {
    slug: "nobody-saves-the-world",
    description:
      "Uma aventura de acao em que a dupla desbloqueia formas diferentes e combina habilidades para cumprir missoes. O ritmo favorece experimentar builds, limpar masmorras e evoluir personagens sem pressa."
  },
  {
    slug: "portal-2",
    description:
      "A campanha cooperativa de Portal 2 coloca dois robos resolvendo salas de teste feitas para comunicacao precisa. Portais, timing e observacao viram o centro da experiencia, com puzzles que raramente funcionam no silencio."
  },
  {
    slug: "sackboy-a-big-adventure",
    description:
      "Uma aventura de plataforma colorida e acessivel, boa para sessoes leves em dupla. As fases misturam colecionaveis, desafios de precisao e momentos cooperativos sem exigir compromisso pesado."
  },
  {
    slug: "trine-4-the-nightmare-prince",
    description:
      "Tres herois com habilidades complementares atravessam cenarios de fantasia cheios de puzzles fisicos e combate leve. Em dupla, a diversao esta em improvisar solucoes e quebrar um pouco a logica do cenario."
  },
  {
    slug: "unravel-two",
    description:
      "Dois personagens ligados por um fio atravessam fases de plataforma e puzzles com ritmo contemplativo. A experiencia valoriza coordenacao, cuidado nos saltos e pequenas descobertas compartilhadas."
  },
  {
    slug: "we-were-here-together",
    description:
      "Um jogo de puzzles assimetricos em que cada pessoa ve partes diferentes da solucao. A dupla precisa descrever bem o que enxerga, confiar no outro lado e transformar conversa em progresso."
  }
];

const availabilitySeeds: AvailabilitySeed[] = [
  {
    slug: "a-way-out-2018",
    type: "game-pass",
    platformKey: "xbox",
    source: "Xbox Store / EA Play",
    sourceUrl: "https://www.xbox.com/en-us/games/store/a-way-out/bwvbncmf22zk",
    checkedAt: availabilityCheckedAt
  },
  {
    slug: "it-takes-two-2",
    type: "game-pass",
    platformKey: "xbox",
    source: "Xbox Store",
    sourceUrl: "https://www.xbox.com/en-us/games/store/It-Takes-Two/9NKJ0VZQ4N0L",
    checkedAt: availabilityCheckedAt
  },
  {
    slug: "unravel-two",
    type: "game-pass",
    platformKey: "xbox",
    source: "Xbox Store / EA Play",
    sourceUrl: "https://www.xbox.com/en-us/games/store/Unravel-Two/C4VKLMG1HLZW",
    checkedAt: availabilityCheckedAt
  }
];

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const apply = args.includes("--apply") || !dryRun;

if (dryRun && apply) {
  throw new Error("Use either --apply or --dry-run, not both.");
}

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        localizations: {
          inputCount: localizationSeeds.length
        },
        availability: {
          inputCount: availabilitySeeds.length
        }
      },
      null,
      2
    )
  );
  process.exit(0);
}

const pool = createRuntimePool();
const client = await pool.connect();
const result = {
  mode: "apply",
  localizations: {
    inputCount: localizationSeeds.length,
    appliedCount: 0,
    missingSlugs: [] as string[]
  },
  availability: {
    inputCount: availabilitySeeds.length,
    appliedCount: 0,
    missingSlugs: [] as string[]
  }
};

try {
  await client.query("BEGIN");

  for (const seed of localizationSeeds) {
    const gameId = await findGameIdBySlug(seed.slug);

    if (!gameId) {
      result.localizations.missingSlugs.push(seed.slug);
      continue;
    }

    await client.query(
      `
        INSERT INTO catalog.game_localizations (
          game_id,
          locale,
          version,
          status,
          title,
          description,
          source,
          source_url,
          raw_source_hash,
          provenance,
          author_kind,
          author_id,
          reviewer_kind,
          reviewer_id,
          review_notes,
          quality_check,
          reviewed_at,
          published_at,
          updated_at
        )
        VALUES (
          $1, 'pt-BR', 1, 'published', NULL, $2, 'queue2-curation',
          NULL, NULL, $3::jsonb, 'seed', 'queue2-phase-2-polish',
          'operator', 'queue2-curation',
          'Seed PT-BR copy migrated from accepted Phase 2 catalog polish.',
          $4::jsonb, $5, $6, now()
        )
        ON CONFLICT (game_id, locale, version) DO UPDATE
        SET status = excluded.status,
            title = excluded.title,
            description = excluded.description,
            source = excluded.source,
            source_url = excluded.source_url,
            raw_source_hash = excluded.raw_source_hash,
            provenance = excluded.provenance,
            author_kind = excluded.author_kind,
            author_id = excluded.author_id,
            reviewer_kind = excluded.reviewer_kind,
            reviewer_id = excluded.reviewer_id,
            review_notes = excluded.review_notes,
            quality_check = excluded.quality_check,
            reviewed_at = excluded.reviewed_at,
            published_at = excluded.published_at,
            updated_at = now()
      `,
      [
        gameId,
        seed.description,
        JSON.stringify(provenance),
        JSON.stringify(qualityCheck),
        reviewedAt,
        reviewedAt
      ]
    );
    result.localizations.appliedCount += 1;
  }

  for (const seed of availabilitySeeds) {
    const gameId = await findGameIdBySlug(seed.slug);

    if (!gameId) {
      result.availability.missingSlugs.push(seed.slug);
      continue;
    }

    await client.query(
      `
        INSERT INTO catalog.game_availability (
          game_id,
          availability_type,
          platform_key,
          source,
          source_url,
          checked_at,
          status,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'available', now())
        ON CONFLICT (game_id, availability_type, platform_key) DO UPDATE
        SET source = excluded.source,
            source_url = excluded.source_url,
            checked_at = excluded.checked_at,
            status = excluded.status,
            updated_at = now()
      `,
      [
        gameId,
        seed.type,
        seed.platformKey,
        seed.source,
        seed.sourceUrl,
        seed.checkedAt
      ]
    );
    result.availability.appliedCount += 1;
  }

  await client.query("COMMIT");
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}

async function findGameIdBySlug(slug: string): Promise<string | null> {
  const lookup = await client.query<{ id: string }>(
    "SELECT id FROM catalog.games WHERE slug = $1 LIMIT 1",
    [slug]
  );

  return lookup.rows[0]?.id ?? null;
}
