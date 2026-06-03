import type { JoinDuoResult } from "../application/join-duo";
import type {
  UpdateDuoSettingsResult,
  UpdateProfileResult
} from "../application/update-duo-settings";

export type DuoStatusState =
  | "codigo-criado"
  | "codigo-revogado"
  | "codigo-invalido"
  | "codigo-inativo"
  | "limite-tentativas"
  | "dupla-formada"
  | "dupla-recem-formada"
  | "ja-pareado"
  | "dupla-atualizada"
  | "perfil-atualizado"
  | "nome-invalido"
  | "timezone-invalido";

const statusMessages: Record<DuoStatusState, string> = {
  "codigo-criado": "Codigo criado. Compartilhe com a outra pessoa da dupla.",
  "codigo-revogado": "Convite revogado. Voce pode criar um novo codigo quando quiser.",
  "codigo-invalido": "Esse codigo nao parece valido. Confira os seis caracteres e tente de novo.",
  "codigo-inativo": "Esse codigo nao esta mais ativo. Peca um novo codigo para sua dupla.",
  "limite-tentativas": "Muitas tentativas seguidas. Espere um pouco antes de tentar de novo.",
  "dupla-formada": "A fila agora e nossa. Falta dar um nome para a dupla.",
  "dupla-recem-formada": "Essa dupla acabou de ser formada. Peca um novo codigo.",
  "ja-pareado": "Voce ja esta em uma dupla. No QUEUE/2, a fila pertence a dois jogadores fixos.",
  "dupla-atualizada": "Identidade e preferencias da dupla atualizadas.",
  "perfil-atualizado": "Nome de exibicao atualizado.",
  "nome-invalido": "Use um nome curto em texto simples, sem HTML ou formatacao.",
  "timezone-invalido": "Confirme um fuso valido para a dupla."
};

export function getDuoStatusMessage(
  state: string | null | undefined,
  attemptsRemaining?: number
): string | null {
  if (!state || !(state in statusMessages)) {
    return null;
  }

  const baseMessage = statusMessages[state as DuoStatusState];

  if (
    (state === "codigo-inativo" || state === "dupla-recem-formada") &&
    typeof attemptsRemaining === "number" &&
    attemptsRemaining > 0 &&
    attemptsRemaining <= 2
  ) {
    return `${baseMessage} Restam ${attemptsRemaining} tentativas antes da espera.`;
  }

  return baseMessage;
}

export function joinResultToStatus(result: JoinDuoResult): DuoStatusState {
  if (result.ok) {
    return "dupla-formada";
  }

  switch (result.state) {
    case "invalid":
      return "codigo-invalido";
    case "inactive":
      return "codigo-inativo";
    case "attempt-limited":
      return "limite-tentativas";
    case "race-lost":
      return "dupla-recem-formada";
    case "already-paired":
      return "ja-pareado";
  }
}

export function duoUpdateResultToStatus(
  result: UpdateDuoSettingsResult
): DuoStatusState {
  if (result.ok) {
    return "dupla-atualizada";
  }

  return result.state === "invalid-timezone" ? "timezone-invalido" : "nome-invalido";
}

export function profileUpdateResultToStatus(
  result: UpdateProfileResult
): DuoStatusState {
  return result.ok ? "perfil-atualizado" : "nome-invalido";
}

export function buildDuoPath(
  path: string,
  params: Record<string, string | number | undefined>
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const search = searchParams.toString();
  return search ? `${path}?${search}` : path;
}

export function formatPairingDate(value: Date, timezone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: timezone
  }).format(value);
}

export function formatPairingCodeExpiry(value: Date, timezone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: timezone
  }).format(value);
}
