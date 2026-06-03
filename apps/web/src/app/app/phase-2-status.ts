export function getPhase2StatusMessage(state: string | null): string | null {
  switch (state) {
    case "wishlist-adicionada":
      return "Jogo adicionado a Wishlist compartilhada.";
    case "jogo-nao-encontrado":
      return "Nao encontramos esse jogo no catalogo sincronizado.";
    case "plataformas-atualizadas":
      return "Suas plataformas foram atualizadas para a dupla.";
    case "plataforma-invalida":
      return "Uma das plataformas enviadas nao e aceita nesta fase.";
    case "status-atualizado":
      return "Status atualizado na biblioteca da dupla.";
    case "limite-jogando":
      return "Jogando ja tem tres jogos. Pause um deles antes de puxar outro.";
    case "estado-futuro-bloqueado":
      return "Zerado e Dropado exigem confirmacao dupla na Fase 4.";
    case "biblioteca-nao-encontrada":
      return "Esse jogo ainda nao esta na biblioteca da dupla.";
    case "acao-invalida":
      return "Nao foi possivel concluir essa acao.";
    default:
      return null;
  }
}

export function getSearchParam(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
