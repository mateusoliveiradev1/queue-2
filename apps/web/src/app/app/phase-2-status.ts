export function getPhase2StatusMessage(state: string | null): string | null {
  switch (state) {
    case "wishlist-adicionada":
      return "Jogo adicionado a Wishlist compartilhada.";
    case "jogo-nao-encontrado":
      return "Nao encontramos esse jogo no catalogo sincronizado.";
    case "plataformas-atualizadas":
      return "Suas plataformas foram atualizadas para a dupla.";
    case "plataforma-invalida":
      return "Uma das plataformas enviadas nao e aceita na biblioteca.";
    case "status-atualizado":
      return "Status atualizado na biblioteca da dupla.";
    case "limite-jogando":
      return "Jogando ja tem tres jogos. Pause um deles antes de puxar outro.";
    case "estado-futuro-bloqueado":
      return "Zerado e Dropado exigem confirmacao dos dois.";
    case "biblioteca-nao-encontrada":
      return "Esse jogo ainda nao esta na biblioteca da dupla.";
    case "acao-invalida":
      return "Nao foi possivel concluir essa acao.";
    case "sessao-ao-vivo-iniciada":
      return "Sessao ao vivo iniciada para a dupla.";
    case "sessao-pendente-confirmacao":
    case "jogamos-hoje-pendente":
      return "Sessao enviada para confirmacao da dupla.";
    case "sessao-confirmada":
      return "Sessao confirmada e progresso atualizado.";
    case "sessao-ao-vivo-ja-ativa":
      return "Ja existe uma sessao ao vivo em andamento.";
    case "confirmacao-pendente-existe":
      return "Confirmem a sessao pendente antes de registrar outra.";
    case "confirmacao-ja-registrada":
      return "Sua confirmacao ja estava registrada.";
    case "duracao-invalida":
      return "Informe uma duracao entre 5 minutos e 12 horas.";
    case "jogo-nao-esta-jogando":
      return "Esse jogo precisa estar em Jogando para registrar sessao.";
    case "sessao-nao-ativa":
      return "Nao encontramos uma sessao ao vivo ativa.";
    case "sessao-nao-encontrada":
      return "Nao encontramos essa sessao.";
    case "progresso-atualizado":
      return "Progresso atualizado para a dupla.";
    case "capitulo-criado":
      return "Capitulo criado na jornada.";
    case "capitulo-atualizado":
      return "Capitulo atualizado na jornada.";
    case "pedido-terminal-pendente":
      return "Pedido enviado para confirmacao da dupla.";
    case "pedido-terminal-cancelado":
      return "Pedido cancelado.";
    case "pedido-terminal-confirmado":
      return "Status final confirmado pela dupla.";
    case "sessao-agendada":
      return "Sessao agendada para a dupla.";
    case "sessao-agendada-cancelada":
      return "Sessao agendada cancelada.";
    case "presenca-confirmada":
      return "Presenca confirmada na sessao agendada.";
    case "momento-criado":
      return "Momento adicionado a linha do tempo.";
    case "spoiler-revelado":
      return "Spoiler liberado nesta visualizacao.";
    default:
      return null;
  }
}

export function getSearchParam(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
