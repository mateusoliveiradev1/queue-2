import { z } from "zod";

export const AUTH_PAIRING_CALLBACK_URL = "/parear";
export const AUTH_RESET_CALLBACK_URL = "/recuperar-senha";
export const AUTH_RESEND_COOLDOWN_SECONDS = 60;

export const queuePasswordRules = [
  {
    id: "length",
    label: "Pelo menos 8 caracteres"
  },
  {
    id: "letter-and-number",
    label: "Uma letra e um numero"
  },
  {
    id: "symbol",
    label: "Um simbolo ou caractere especial"
  },
  {
    id: "not-obvious",
    label: "Nada de senha reutilizada"
  }
] as const;

export type QueuePasswordRuleId = (typeof queuePasswordRules)[number]["id"];
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
    "erro-cadastro": "Nao foi possivel criar a conta com esses dados agora."
  },
  verify: {
    cadastro: "Cadastro recebido. Enviamos um link para confirmar seu email.",
    "verifique-email": "Email ainda nao confirmado. Reenviamos o link quando possivel.",
    reenviado: "Se houver uma conta pendente com esse email, um novo link sera enviado.",
    "email-corrigido": "Registramos uma nova verificacao para o email informado.",
    "email-invalido": "Informe um email valido para receber a verificacao.",
    "correcao-incompleta": "Para corrigir sem sessao ativa, informe nome, email e senha novamente.",
    "link-invalido": "Link expirado ou ja usado. Solicite um novo envio abaixo."
  },
  recover: {
    enviado: "Se o email existir, o link de recuperacao chega por la.",
    "dados-invalidos": "Revise os campos e tente de novo.",
    "senha-invalida": "A nova senha ainda nao cumpre todos os requisitos.",
    "link-invalido": "Link expirado ou ja usado. Solicite um novo link.",
    "senha-alterada": "Senha alterada. Entre com a nova senha para seguir."
  }
} as const;

const displayNameSchema = z.string().trim().min(2).max(40);
const emailSchema = z.string().trim().email().max(320);
const passwordSchema = z.string().min(1).max(128);
const tokenSchema = z.string().trim().min(8).max(512);
const commonPasswordFragments = ["senha", "password", "queue2", "12345678", "qwerty", "abcdef"];

const signupSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema
});

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

const resetRequestSchema = z.object({
  email: emailSchema
});

const correctEmailSchema = z.object({
  currentEmail: emailSchema,
  email: emailSchema,
  password: passwordSchema
});

const resetCompletionSchema = z.object({
  token: tokenSchema,
  password: passwordSchema
});

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

export function validateQueuePassword(
  password: string,
  context: { email?: string; displayName?: string } = {}
): { ok: boolean; failedRules: QueuePasswordRuleId[] } {
  const normalizedPassword = password.toLowerCase();
  const emailLocalPart = context.email?.split("@")[0]?.toLowerCase() ?? "";
  const displayNameParts = (context.displayName ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter((part) => part.length >= 3);

  const failedRules: QueuePasswordRuleId[] = [];

  if (password.length < 8) {
    failedRules.push("length");
  }

  if (!/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
    failedRules.push("letter-and-number");
  }

  if (!/[^a-z0-9]/i.test(password)) {
    failedRules.push("symbol");
  }

  const containsIdentity =
    Boolean(emailLocalPart && normalizedPassword.includes(emailLocalPart)) ||
    displayNameParts.some((part) => normalizedPassword.includes(part));
  const containsCommonFragment = commonPasswordFragments.some((fragment) =>
    normalizedPassword.includes(fragment)
  );

  if (containsIdentity || containsCommonFragment) {
    failedRules.push("not-obvious");
  }

  return {
    ok: failedRules.length === 0,
    failedRules
  };
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

export async function signupAction(formData: FormData) {
  "use server";

  const parsed = signupSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return redirectTo(buildAuthPath("/cadastro", { estado: "dados-invalidos" }));
  }

  const email = normalizeAuthEmail(parsed.data.email);
  const password = parsed.data.password;
  const displayName = parsed.data.displayName.trim();
  const passwordValidation = validateQueuePassword(password, { displayName, email });

  if (!passwordValidation.ok) {
    return redirectTo(buildAuthPath("/cadastro", { estado: "senha-invalida" }));
  }

  let target = buildVerificationPath(email, "cadastro");

  try {
    const { auth, requestHeaders } = await getAuthRuntime();
    await auth.api.signUpEmail({
      body: {
        name: displayName,
        email,
        password,
        callbackURL: AUTH_PAIRING_CALLBACK_URL,
        rememberMe: true
      },
      headers: requestHeaders
    });
  } catch {
    target = buildAuthPath("/cadastro", { estado: "erro-cadastro" });
  }

  return redirectTo(target);
}

export async function loginAction(formData: FormData) {
  "use server";

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return redirectTo(buildAuthPath("/login", { estado: "credenciais-invalidas" }));
  }

  const email = normalizeAuthEmail(parsed.data.email);
  let target = AUTH_PAIRING_CALLBACK_URL;

  try {
    const { auth, requestHeaders } = await getAuthRuntime();
    const result = await auth.api.signInEmail({
      body: {
        email,
        password: parsed.data.password,
        callbackURL: AUTH_PAIRING_CALLBACK_URL,
        rememberMe: true
      },
      headers: requestHeaders
    });

    if (result.user && !result.user.emailVerified) {
      target = buildVerificationPath(email, "verifique-email");
    }
  } catch (error) {
    target = isUnverifiedEmailError(error)
      ? buildVerificationPath(email, "verifique-email")
      : buildAuthPath("/login", { estado: "credenciais-invalidas" });
  }

  return redirectTo(target);
}

export async function resendVerificationAction(formData: FormData) {
  "use server";

  const email = normalizeAuthEmail(formData.get("email"));

  if (!emailSchema.safeParse(email).success) {
    return redirectTo(buildAuthPath("/verificar-email", { estado: "email-invalido" }));
  }

  try {
    const { auth, requestHeaders } = await getAuthRuntime();
    await auth.api.sendVerificationEmail({
      body: {
        email,
        callbackURL: AUTH_PAIRING_CALLBACK_URL
      },
      headers: requestHeaders
    });
  } catch {
    // Keep the response neutral; the UI must not reveal whether the account exists.
  }

  return redirectTo(buildVerificationPath(email, "reenviado"));
}

export async function correctEmailAction(formData: FormData) {
  "use server";

  const parsed = correctEmailSchema.safeParse({
    currentEmail: formData.get("currentEmail"),
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return redirectTo(buildAuthPath("/verificar-email", { estado: "correcao-incompleta" }));
  }

  const currentEmail = normalizeAuthEmail(parsed.data.currentEmail);
  const email = normalizeAuthEmail(parsed.data.email);
  const password = parsed.data.password;
  let corrected = false;

  try {
    const { auth, requestHeaders } = await getAuthRuntime();

    try {
      await auth.api.signInEmail({
        body: {
          email: currentEmail,
          password,
          callbackURL: AUTH_PAIRING_CALLBACK_URL,
          rememberMe: true
        },
        headers: requestHeaders
      });
    } catch (error) {
      if (!isUnverifiedEmailError(error)) {
        throw error;
      }
    }

    const context = await auth.$context;
    const pendingUser = await context.internalAdapter.findUserByEmail(currentEmail);

    if (!pendingUser?.user || pendingUser.user.emailVerified) {
      throw new Error("pending_user_not_found");
    }

    if (currentEmail !== email) {
      const destinationUser = await context.internalAdapter.findUserByEmail(email);

      if (destinationUser) {
        throw new Error("pending_email_destination_unavailable");
      }

      const updatedUser = await context.internalAdapter.updateUserByEmail(currentEmail, {
        email,
        emailVerified: false
      });

      if (!updatedUser) {
        throw new Error("pending_email_update_failed");
      }
    }

    await auth.api.sendVerificationEmail({
      body: {
        email,
        callbackURL: AUTH_PAIRING_CALLBACK_URL
      },
      headers: requestHeaders
    });

    corrected = true;
  } catch {
    // Keep the result neutral; the UI must not reveal which credential or email failed.
  }

  return redirectTo(
    buildVerificationPath(email, corrected ? "email-corrigido" : "correcao-incompleta")
  );
}

export async function requestPasswordResetAction(formData: FormData) {
  "use server";

  const parsed = resetRequestSchema.safeParse({
    email: formData.get("email")
  });

  if (!parsed.success) {
    return redirectTo(buildAuthPath("/recuperar-senha", { estado: "dados-invalidos" }));
  }

  const email = normalizeAuthEmail(parsed.data.email);

  try {
    const { auth, requestHeaders } = await getAuthRuntime();
    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: AUTH_RESET_CALLBACK_URL
      },
      headers: requestHeaders
    });
  } catch {
    // Keep reset request timing and messaging neutral.
  }

  return redirectTo(buildAuthPath("/recuperar-senha", { estado: "enviado" }));
}

export async function completePasswordResetAction(formData: FormData) {
  "use server";

  const parsed = resetCompletionSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return redirectTo(buildAuthPath("/recuperar-senha", { estado: "dados-invalidos" }));
  }

  const passwordValidation = validateQueuePassword(parsed.data.password);

  if (!passwordValidation.ok) {
    return redirectTo(
      buildAuthPath("/recuperar-senha", {
        token: parsed.data.token,
        estado: "senha-invalida"
      })
    );
  }

  let target = buildAuthPath("/login", { estado: "senha-alterada" });

  try {
    const { auth, requestHeaders } = await getAuthRuntime();
    await auth.api.resetPassword({
      body: {
        token: parsed.data.token,
        newPassword: parsed.data.password
      },
      headers: requestHeaders
    });
  } catch {
    target = buildAuthPath("/recuperar-senha", { estado: "link-invalido" });
  }

  return redirectTo(target);
}

export async function logoutAction(_formData?: FormData) {
  "use server";

  try {
    const { auth, requestHeaders } = await getAuthRuntime();
    await auth.api.signOut({
      headers: requestHeaders
    });
  } catch {
    // Logout remains idempotent from the user's perspective.
  }

  return redirectTo(buildAuthPath("/login", { estado: "saiu" }));
}

function isUnverifiedEmailError(error: unknown): boolean {
  return serializeError(error).includes("email_not_verified");
}

function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.toLowerCase();
  }

  try {
    return JSON.stringify(error).toLowerCase();
  } catch {
    return "";
  }
}

async function getAuthRuntime() {
  const [{ headers }, { auth }] = await Promise.all([import("next/headers"), import("./server")]);

  return {
    auth,
    requestHeaders: await headers()
  };
}

async function redirectTo(path: string): Promise<never> {
  const { redirect } = await import("next/navigation");
  redirect(path);
  throw new Error("Next.js redirect did not terminate.");
}
