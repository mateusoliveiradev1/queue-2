const portugueseDescriptions: Record<string, string> = {
  "a-way-out-2018":
    "Dois prisioneiros precisam cooperar para escapar, improvisar planos e lidar com as consequencias da fuga. A campanha foi criada para duas pessoas e alterna acao, stealth, direcao e pequenas decisoes de ritmo.",
  "castle-crashers":
    "Um beat 'em up cooperativo leve, caotico e direto, feito para avancar fase a fase com a dupla dividindo pancadaria, magias e piadas visuais. Funciona bem quando a fila pede algo facil de entrar e dificil de levar a serio demais.",
  "children-of-morta":
    "A familia Bergson enfrenta uma ameaca crescente em uma aventura de acao com progressao compartilhada. A dupla alterna herois, combina estilos e avanca por tentativas curtas com clima de fantasia sombria.",
  cuphead:
    "Cuphead mistura chefes exigentes, plataforma e visual de animacao classica em uma campanha cooperativa intensa. A dupla precisa coordenar esquivas, reviver no susto e aceitar que algumas fases vao pedir repeticao.",
  "it-takes-two-2":
    "May e Cody sao transformados em bonecos e precisam cooperar para atravessar mundos cheios de mecanicas novas. Cada trecho da campanha muda a forma de jogar, entao a dupla quase sempre precisa conversar, testar e rir do erro junto.",
  "lovers-in-a-dangerous-spacetime":
    "A dupla pilota uma nave cheia de estacoes, correndo entre armas, escudos e motor para sobreviver ao caos. E um coop de comunicacao constante, em que a graca esta em dividir tarefas sob pressao.",
  "nobody-saves-the-world":
    "Uma aventura de acao em que a dupla desbloqueia formas diferentes e combina habilidades para cumprir missoes. O ritmo favorece experimentar builds, limpar masmorras e evoluir personagens sem pressa.",
  "portal-2":
    "A campanha cooperativa de Portal 2 coloca dois robos resolvendo salas de teste feitas para comunicacao precisa. Portais, timing e observacao viram o centro da experiencia, com puzzles que raramente funcionam no silencio.",
  "sackboy-a-big-adventure":
    "Uma aventura de plataforma colorida e acessivel, boa para sessoes leves em dupla. As fases misturam colecionaveis, desafios de precisao e momentos cooperativos sem exigir compromisso pesado.",
  "trine-4-the-nightmare-prince":
    "Tres herois com habilidades complementares atravessam cenarios de fantasia cheios de puzzles fisicos e combate leve. Em dupla, a diversao esta em improvisar solucoes e quebrar um pouco a logica do cenario.",
  "unravel-two":
    "Dois personagens ligados por um fio atravessam fases de plataforma e puzzles com ritmo contemplativo. A experiencia valoriza coordenacao, cuidado nos saltos e pequenas descobertas compartilhadas.",
  "we-were-here-together":
    "Um jogo de puzzles assimetricos em que cada pessoa ve partes diferentes da solucao. A dupla precisa descrever bem o que enxerga, confiar no outro lado e transformar conversa em progresso."
};

export function getPortugueseCatalogDescription(slug: string): string | null {
  return portugueseDescriptions[slug] ?? null;
}
