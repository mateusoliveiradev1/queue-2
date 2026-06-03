export {
  queuePasswordRules,
  validateQueuePassword,
  type QueuePasswordRuleId
} from "./password-policy";

export const AUTH_PAIRING_CALLBACK_URL = "/parear";
export const AUTH_RESET_CALLBACK_URL = "/recuperar-senha";
export const AUTH_RESEND_COOLDOWN_SECONDS = 60;

export type AuthSurface = "login" | "signup" | "verify" | "recover";

export const authStatusMessages = {
  login: {
    saiu: "Sessao encerrada. Entre de novo para voltar para a fila da dupla.",
    "senha-alterada": "Senha alterada. Entre com a nova senha para seguir.",
    "credenciais-invalidas": "Nao foi possivel entrar. Confira email, senha e verificacao.",
    "verifique-email": "Confirme seu email antes de acessar a fila da dupla."
  },
  signup: {
    "dados-invalidos": "Revise os campos antes de criar a conta.",
    "senha-invalida": "A senha ainda nao cumpre todos os requisitos.",
    "senha-comprometida": "Essa senha aparece em vazamentos conhecidos. Escolha outra.",
    "senhas-diferentes": "As senhas informadas nao conferem.",
    "erro-cadastro": "Nao foi possivel criar a conta com esses dados agora."
  },
  verify: {
    cadastro: "Cadastro recebido. Enviamos um link para confirmar seu email.",
    "verifique-email": "Email ainda nao confirmado. Reenviamos o link quando possivel.",
    reenviado: "Se houver uma conta pendente com esse email, um novo link sera enviado.",
    "email-corrigido": "Registramos uma nova verificacao para o email informado.",
    "email-invalido": "Informe um email valido para receber a verificacao.",
    "correcao-incompleta": "Confira o email cadastrado, o novo email e a senha antes de tentar de novo.",
    "link-invalido": "Link expirado ou ja usado. Solicite um novo envio abaixo."
  },
  recover: {
    enviado: "Se o email existir, o link de recuperacao chega por la.",
    "dados-invalidos": "Revise os campos e tente de novo.",
    "senha-invalida": "A nova senha ainda nao cumpre todos os requisitos.",
    "senha-comprometida": "Essa senha aparece em vazamentos conhecidos. Escolha outra.",
    "link-invalido": "Link expirado ou ja usado. Solicite um novo link.",
    "senha-alterada": "Senha alterada. Entre com a nova senha para seguir."
  }
} as const;

export function getAuthStatusMessage(surface: AuthSurface, state: string | null | undefined): string | null {
  if (!state) {
    return null;
  }

  const messages = authStatusMessages[surface] as Record<string, string>;
  return messages[state] ?? null;
}

export function normalizeAuthEmail(value: FormDataEntryValue | string | null): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function buildAuthPath(path: string, params: Record<string, string | undefined> = {}): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const search = searchParams.toString();
  return search ? `${path}?${search}` : path;
}

export function buildVerificationPath(email: string, state: string): string {
  return buildAuthPath("/verificar-email", {
    email,
    estado: state
  });
}

export function buildVerificationCallbackPath(email: string): string {
  return buildVerificationPath(email, "verificado");
}
