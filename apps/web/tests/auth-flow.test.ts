import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

import SignupPage from "../src/app/(public)/cadastro/page";
import LoginPage from "../src/app/(public)/login/page";
import RecoverPasswordPage from "../src/app/(public)/recuperar-senha/page";
import VerifyEmailPage from "../src/app/(public)/verificar-email/page";
import {
  AUTH_RESEND_COOLDOWN_SECONDS,
  authStatusMessages,
  buildAuthPath,
  buildVerificationPath,
  completePasswordResetAction,
  correctEmailAction,
  getAuthStatusMessage,
  loginAction,
  logoutAction,
  normalizeAuthEmail,
  queuePasswordRules,
  requestPasswordResetAction,
  resendVerificationAction,
  signupAction,
  validateQueuePassword
} from "../src/platform/auth/actions";

const actionsSource = readFileSync("src/platform/auth/actions.ts", "utf8");

afterEach(() => {
  cleanup();
});

describe("auth flow server actions", () => {
  it("exports all actions used by the public auth forms", () => {
    expect(signupAction).toEqual(expect.any(Function));
    expect(loginAction).toEqual(expect.any(Function));
    expect(resendVerificationAction).toEqual(expect.any(Function));
    expect(correctEmailAction).toEqual(expect.any(Function));
    expect(requestPasswordResetAction).toEqual(expect.any(Function));
    expect(completePasswordResetAction).toEqual(expect.any(Function));
    expect(logoutAction).toEqual(expect.any(Function));
  });

  it("keeps server-side password validation aligned with the visible checklist", () => {
    expect(queuePasswordRules.map((rule) => rule.label)).toEqual([
      "Pelo menos 8 caracteres",
      "Uma letra e um numero",
      "Um simbolo ou caractere especial",
      "Nada de senha reutilizada"
    ]);

    expect(validateQueuePassword("abc").failedRules).toContain("length");
    expect(validateQueuePassword("abcdefgh").failedRules).toContain("letter-and-number");
    expect(validateQueuePassword("abcd1234").failedRules).toContain("symbol");
    expect(
      validateQueuePassword("Queue2!123", {
        email: "jogador@example.com",
        displayName: "Jogador"
      }).failedRules
    ).toContain("not-obvious");
    expect(validateQueuePassword("Fila!2026").ok).toBe(true);
  });

  it("normalizes route targets without leaking submitted email casing", () => {
    expect(normalizeAuthEmail("  Pessoa@Example.COM  ")).toBe("pessoa@example.com");
    expect(buildAuthPath("/login", { estado: "saiu" })).toBe("/login?estado=saiu");
    expect(buildVerificationPath("pessoa@example.com", "cadastro")).toBe(
      "/verificar-email?email=pessoa%40example.com&estado=cadastro"
    );
  });

  it("delegates to Better Auth endpoints for real auth operations", () => {
    expect(actionsSource).toContain("auth.api.signUpEmail");
    expect(actionsSource).toContain("auth.api.signInEmail");
    expect(actionsSource).toContain("auth.api.sendVerificationEmail");
    expect(actionsSource).toContain("auth.api.changeEmail");
    expect(actionsSource).toContain("auth.api.requestPasswordReset");
    expect(actionsSource).toContain("auth.api.resetPassword");
    expect(actionsSource).toContain("auth.api.signOut");
  });

  it("routes unverified login away from authenticated app routes", () => {
    expect(actionsSource).toContain("emailVerified");
    expect(actionsSource).toContain("verifique-email");
    expect(actionsSource).toContain("/verificar-email");
    expect(actionsSource).not.toContain('target = "/app"');
  });

  it("records a new verification state for corrected emails using Better Auth capabilities", () => {
    expect(actionsSource).toMatch(/changeEmail[\s\S]*signUpEmail[\s\S]*sendVerificationEmail/);
    expect(actionsSource).toContain("AUTH_PAIRING_CALLBACK_URL");
    expect(getAuthStatusMessage("verify", "email-corrigido")).toMatch(/nova verificacao/i);
  });

  it("keeps user-facing auth messages Portuguese and neutral", () => {
    const forbiddenFragments = [
      "better auth",
      "database",
      "postgres",
      "sql",
      "secret",
      "usuario encontrado",
      "conta encontrada",
      "erro interno"
    ];

    for (const messages of Object.values(authStatusMessages)) {
      for (const message of Object.values(messages)) {
        const normalized = message.toLowerCase();
        expect(normalized).not.toMatch(/[{}]/);

        for (const fragment of forbiddenFragments) {
          expect(normalized).not.toContain(fragment);
        }
      }
    }
  });
});

describe("auth pages wired to flow states", () => {
  it("renders signup status and server-backed password checklist", async () => {
    render(
      await SignupPage({
        searchParams: Promise.resolve({ estado: "senha-invalida" })
      })
    );

    expect(screen.getByRole("status")).toHaveTextContent(/senha ainda nao cumpre/i);
    expect(screen.getByRole("list", { name: /checklist da senha/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /criar conta/i })).toBeInTheDocument();
  });

  it("renders login verification state instead of sending users into the app", async () => {
    render(
      await LoginPage({
        searchParams: Promise.resolve({ estado: "verifique-email" })
      })
    );

    expect(screen.getByRole("status")).toHaveTextContent(/confirme seu email/i);
    expect(screen.getByRole("button", { name: /^entrar$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /esqueci minha senha/i })).toHaveAttribute(
      "href",
      "/recuperar-senha"
    );
  });

  it("renders verification resend, correction and logout states", async () => {
    render(
      await VerifyEmailPage({
        searchParams: Promise.resolve({
          email: "dupla@example.com",
          estado: "reenviado"
        })
      })
    );

    expect(screen.getByRole("status")).toHaveTextContent(/novo link/i);
    expect(screen.getByText(/dupla@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reenviar email/i })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${AUTH_RESEND_COOLDOWN_SECONDS} segundos`, "i"))).toBeInTheDocument();
    expect(screen.getByLabelText(/corrigir email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nome de exibicao/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha escolhida/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sair desta conta/i })).toBeInTheDocument();
  });

  it("renders reset request with neutral enumeration-safe copy", async () => {
    render(
      await RecoverPasswordPage({
        searchParams: Promise.resolve({ estado: "enviado" })
      })
    );

    expect(screen.getByRole("status")).toHaveTextContent(/se o email existir/i);
    expect(screen.getByLabelText(/email da conta/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enviar link seguro/i })).toBeInTheDocument();
  });

  it("renders reset completion when Better Auth callback supplies a token", async () => {
    render(
      await RecoverPasswordPage({
        searchParams: Promise.resolve({ token: "reset-token-123456", estado: "senha-invalida" })
      })
    );

    expect(screen.getByRole("status")).toHaveTextContent(/nova senha/i);
    expect(screen.getByLabelText(/nova senha/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /alterar senha/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/email da conta/i)).not.toBeInTheDocument();
  });
});
