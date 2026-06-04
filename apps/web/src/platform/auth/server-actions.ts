"use server";

import { z } from "zod";

import {
  AUTH_PAIRING_CALLBACK_URL,
  AUTH_RESET_CALLBACK_URL,
  buildAuthPath,
  buildVerificationCallbackPath,
  buildVerificationPath,
  normalizeAuthEmail,
  validateQueuePassword
} from "./actions";
import { checkPasswordBreach } from "./password-breach";

const displayNameSchema = z.string().trim().min(2).max(40);
const emailSchema = z.string().trim().email().max(320);
const passwordSchema = z.string().min(1).max(128);
const tokenSchema = z.string().trim().min(8).max(512);

const signupSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: passwordSchema
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

export async function signupAction(formData: FormData) {
  const parsed = signupSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword")
  });

  if (!parsed.success) {
    return redirectTo(buildAuthPath("/cadastro", { estado: "dados-invalidos" }));
  }

  const email = normalizeAuthEmail(parsed.data.email);
  const password = parsed.data.password;
  const displayName = parsed.data.displayName.trim();

  if (password !== parsed.data.confirmPassword) {
    return redirectTo(buildAuthPath("/cadastro", { estado: "senhas-diferentes" }));
  }

  const passwordValidation = validateQueuePassword(password, { displayName, email });

  if (!passwordValidation.ok) {
    return redirectTo(buildAuthPath("/cadastro", { estado: "senha-invalida" }));
  }

  if ((await checkPasswordBreach(password)).compromised) {
    return redirectTo(buildAuthPath("/cadastro", { estado: "senha-comprometida" }));
  }

  let target = buildVerificationPath(email, "cadastro");

  try {
    const { auth, requestHeaders, requireEmailVerification } = await getAuthRuntime();
    await auth.api.signUpEmail({
      body: {
        name: displayName,
        email,
        password,
        callbackURL: buildVerificationCallbackPath(email),
        rememberMe: true
      },
      headers: requestHeaders
    });
    target = requireEmailVerification ? target : AUTH_PAIRING_CALLBACK_URL;
  } catch (error) {
    logDevelopmentAuthActionError("signup", error);
    target = buildAuthPath("/cadastro", { estado: "erro-cadastro" });
  }

  return redirectTo(target);
}

export async function loginAction(formData: FormData) {
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
    const { auth, requestHeaders, requireEmailVerification } = await getAuthRuntime();
    const result = await auth.api.signInEmail({
      body: {
        email,
        password: parsed.data.password,
        callbackURL: buildVerificationCallbackPath(email),
        rememberMe: true
      },
      headers: requestHeaders
    });

    if (requireEmailVerification && result.user && !result.user.emailVerified) {
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
  const email = normalizeAuthEmail(formData.get("email"));

  if (!emailSchema.safeParse(email).success) {
    return redirectTo(buildAuthPath("/verificar-email", { estado: "email-invalido" }));
  }

  try {
    const { auth, requestHeaders } = await getAuthRuntime();
    await auth.api.sendVerificationEmail({
      body: {
        email,
        callbackURL: buildVerificationCallbackPath(email)
      },
      headers: requestHeaders
    });
  } catch (error) {
    logDevelopmentAuthActionError("resend-verification", error);
    // Keep the response neutral; the UI must not reveal whether the account exists.
  }

  return redirectTo(buildVerificationPath(email, "reenviado"));
}

export async function correctEmailAction(formData: FormData) {
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
          callbackURL: buildVerificationCallbackPath(currentEmail),
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
        callbackURL: buildVerificationCallbackPath(email)
      },
      headers: requestHeaders
    });

    corrected = true;
  } catch (error) {
    logDevelopmentAuthActionError("correct-email", error);
    // Keep the result neutral; the UI must not reveal which credential or email failed.
  }

  return redirectTo(
    buildVerificationPath(email, corrected ? "email-corrigido" : "correcao-incompleta")
  );
}

export async function requestPasswordResetAction(formData: FormData) {
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
  } catch (error) {
    logDevelopmentAuthActionError("request-password-reset", error);
    // Keep reset request timing and messaging neutral.
  }

  return redirectTo(buildAuthPath("/recuperar-senha", { estado: "enviado" }));
}

export async function completePasswordResetAction(formData: FormData) {
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

  if ((await checkPasswordBreach(parsed.data.password)).compromised) {
    return redirectTo(
      buildAuthPath("/recuperar-senha", {
        token: parsed.data.token,
        estado: "senha-comprometida"
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
  } catch (error) {
    logDevelopmentAuthActionError("complete-password-reset", error);
    target = buildAuthPath("/recuperar-senha", { estado: "link-invalido" });
  }

  return redirectTo(target);
}

export async function logoutAction(_formData?: FormData) {
  try {
    const { auth, requestHeaders } = await getAuthRuntime();
    await auth.api.signOut({
      headers: requestHeaders
    });
  } catch (error) {
    logDevelopmentAuthActionError("logout", error);
    // Logout remains idempotent from the user's perspective.
  }

  return redirectTo(buildAuthPath("/login", { estado: "saiu" }));
}

function isUnverifiedEmailError(error: unknown): boolean {
  const serialized = serializeError(error);

  return (
    serialized.includes("email_not_verified") ||
    serialized.includes("email not verified") ||
    serialized.includes("email is not verified") ||
    serialized.includes("emailverified")
  );
}

function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return [
      error.name,
      error.message,
      serializeErrorObject(error),
      error.cause ? serializeError(error.cause) : ""
    ].join(" ").toLowerCase();
  }

  if (error && typeof error === "object") {
    return serializeErrorObject(error).toLowerCase();
  }

  try {
    return JSON.stringify(error).toLowerCase();
  } catch {
    return "";
  }
}

function serializeErrorObject(error: object): string {
  const seen = new WeakSet<object>();

  return serializeObject(error, seen);
}

function serializeObject(value: unknown, seen: WeakSet<object>): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value !== "object") {
    return String(value);
  }

  if (seen.has(value)) {
    return "";
  }

  seen.add(value);

  return Object.getOwnPropertyNames(value)
    .map((key) => `${key}:${serializeObject((value as Record<string, unknown>)[key], seen)}`)
    .join(" ");
}

function logDevelopmentAuthActionError(action: string, error: unknown) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.warn(
    JSON.stringify({
      scope: "queue2.dev-auth-action",
      action,
      error: serializeError(error)
    })
  );
}

async function getAuthRuntime() {
  const [{ headers }, { auth, shouldRequireEmailVerification }] = await Promise.all([
    import("next/headers"),
    import("./server")
  ]);

  return {
    auth,
    requireEmailVerification: shouldRequireEmailVerification(),
    requestHeaders: await headers()
  };
}

async function redirectTo(path: string): Promise<never> {
  const { redirect } = await import("next/navigation");
  redirect(path);
  throw new Error("Next.js redirect did not terminate.");
}
