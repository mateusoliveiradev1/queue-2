import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import SignupPage from "../src/app/(public)/cadastro/page";
import LoginPage from "../src/app/(public)/login/page";
import RecoverPasswordPage from "../src/app/(public)/recuperar-senha/page";
import VerifyEmailPage from "../src/app/(public)/verificar-email/page";
import {
  AUTH_RESEND_COOLDOWN_SECONDS,
  authStatusMessages,
  buildAuthPath,
  buildVerificationCallbackPath,
  buildVerificationPath,
  getAuthStatusMessage,
  normalizeAuthEmail,
  queuePasswordRules,
  validateQueuePassword
} from "../src/platform/auth/actions";
import {
  completePasswordResetAction,
  correctEmailAction,
  loginAction,
  logoutAction,
  requestPasswordResetAction,
  resendVerificationAction,
  signupAction
} from "../src/platform/auth/server-actions";
import {
  checkPasswordBreach,
  hashPasswordSha1,
  parsePwnedPasswordRangeResponse,
  shouldCheckPwnedPasswords
} from "../src/platform/auth/password-breach";

const serverActionsSource = readFileSync("src/platform/auth/server-actions.ts", "utf8");

afterEach(() => {
  cleanup();
  vi.useRealTimers();
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
      "Sem nome, email ou senha comum"
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

  it("checks breached passwords through SHA-1 k-anonymity range lookup", async () => {
    const leakedPassword = "FilaExposta!2026";
    const passwordHash = hashPasswordSha1(leakedPassword);
    const suffix = passwordHash.slice(5);
    const fetcher = vi.fn(
      async () =>
        new Response(`${suffix}:3303003\r\n00000000000000000000000000000000000:1`, {
          status: 200
        })
    );

    expect(passwordHash).toMatch(/^[A-F0-9]{40}$/);
    expect(parsePwnedPasswordRangeResponse(`${suffix}:10`, suffix)).toBe(10);
    expect(shouldCheckPwnedPasswords({ NODE_ENV: "test" } as NodeJS.ProcessEnv)).toBe(false);
    expect(
      shouldCheckPwnedPasswords({
        NODE_ENV: "production",
        AUTH_PASSWORD_BREACH_CHECK: "false"
      } as NodeJS.ProcessEnv)
    ).toBe(false);

    await expect(
      checkPasswordBreach(leakedPassword, {
        env: {
          NODE_ENV: "test",
          AUTH_PASSWORD_BREACH_CHECK: "true"
        } as NodeJS.ProcessEnv,
        fetcher
      })
    ).resolves.toMatchObject({
      checked: true,
      compromised: true,
      occurrences: 3303003
    });

    expect(fetcher).toHaveBeenCalledWith(
      `https://api.pwnedpasswords.com/range/${passwordHash.slice(0, 5)}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "Add-Padding": "true"
        })
      })
    );
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain(leakedPassword);
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain(passwordHash);
  });

  it("normalizes route targets without leaking submitted email casing", () => {
    expect(normalizeAuthEmail("  Pessoa@Example.COM  ")).toBe("pessoa@example.com");
    expect(buildAuthPath("/login", { estado: "saiu" })).toBe("/login?estado=saiu");
    expect(buildVerificationPath("pessoa@example.com", "cadastro")).toBe(
      "/verificar-email?email=pessoa%40example.com&estado=cadastro"
    );
    expect(buildVerificationCallbackPath("pessoa@example.com")).toBe(
      "/verificar-email?email=pessoa%40example.com&estado=verificado"
    );
  });

  it("delegates to Better Auth endpoints for real auth operations", () => {
    expect(serverActionsSource).toContain("confirmPassword");
    expect(serverActionsSource).toContain("senhas-diferentes");
    expect(serverActionsSource).toContain("checkPasswordBreach");
    expect(serverActionsSource).toContain("senha-comprometida");
    expect(serverActionsSource).toContain("auth.api.signUpEmail");
    expect(serverActionsSource).toContain("auth.api.signInEmail");
    expect(serverActionsSource).toContain("auth.api.sendVerificationEmail");
    expect(serverActionsSource).toContain("auth.api.requestPasswordReset");
    expect(serverActionsSource).toContain("auth.api.resetPassword");
    expect(serverActionsSource).toContain("auth.api.signOut");
  });

  it("routes unverified login away from authenticated app routes", () => {
    expect(serverActionsSource).toContain("emailVerified");
    expect(serverActionsSource).toContain("verifique-email");
    expect(serverActionsSource).toContain("/verificar-email");
    expect(serverActionsSource).not.toContain('target = "/app"');
  });

  it("preserves a pending account when correcting email and invalidates the old lookup", () => {
    expect(serverActionsSource).toMatch(
      /currentEmail[\s\S]*signInEmail[\s\S]*internalAdapter\.updateUserByEmail[\s\S]*sendVerificationEmail/
    );
    expect(serverActionsSource).toContain("emailVerified: false");
    expect(serverActionsSource).not.toMatch(/correctEmailAction[\s\S]*auth\.api\.signUpEmail/);
    expect(serverActionsSource).toContain("buildVerificationCallbackPath");
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
        searchParams: Promise.resolve({ estado: "senhas-diferentes" })
      })
    );

    expect(screen.getByRole("status")).toHaveTextContent(/senhas informadas nao conferem/i);
    expect(screen.getByRole("list", { name: /checklist da senha/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /criar conta/i })).toBeInTheDocument();
  });

  it("renders compromised password states for signup and reset completion", async () => {
    render(
      await SignupPage({
        searchParams: Promise.resolve({ estado: "senha-comprometida" })
      })
    );

    expect(screen.getByRole("status")).toHaveTextContent(/vazamentos conhecidos/i);
    cleanup();

    render(
      await RecoverPasswordPage({
        searchParams: Promise.resolve({
          token: "reset-token-123456",
          estado: "senha-comprometida"
        })
      })
    );

    expect(screen.getByRole("status")).toHaveTextContent(/vazamentos conhecidos/i);
  });

  it("updates the signup password checklist while the user types", async () => {
    render(await SignupPage());

    const password = screen.getByLabelText(/^senha$/i);
    const confirmPassword = screen.getByLabelText(/confirmar senha/i);
    const lengthRule = screen.getByText(/pelo menos 8 caracteres/i).closest("li");
    const symbolRule = screen.getByText(/simbolo ou caractere especial/i).closest("li");
    const matchRule = screen.getByText(/senhas precisam conferir/i).closest("li");

    expect(lengthRule).toHaveAttribute("data-rule-state", "pending");
    expect(matchRule).toHaveAttribute("data-rule-state", "pending");
    fireEvent.change(password, { target: { value: "Fila2026" } });
    expect(lengthRule).toHaveAttribute("data-rule-state", "met");
    expect(symbolRule).toHaveAttribute("data-rule-state", "unmet");
    fireEvent.change(confirmPassword, { target: { value: "Fila2025" } });
    expect(matchRule).toHaveAttribute("data-rule-state", "unmet");

    fireEvent.change(password, { target: { value: "Fila!2026" } });
    expect(symbolRule).toHaveAttribute("data-rule-state", "met");
    fireEvent.change(confirmPassword, { target: { value: "Fila!2026" } });
    expect(screen.getByText(/senhas conferem/i).closest("li")).toHaveAttribute(
      "data-rule-state",
      "met"
    );
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
    vi.useFakeTimers();

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
    expect(screen.getByRole("button", { name: /reenviar email/i })).toBeDisabled();
    expect(screen.getByText(new RegExp(`${AUTH_RESEND_COOLDOWN_SECONDS} segundos`, "i"))).toBeInTheDocument();
    expect(screen.getByLabelText(/corrigir email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha escolhida/i)).toBeInTheDocument();
    expect(screen.getByText(/preservar o cadastro/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sair desta conta/i })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/59 segundos/i)).toBeInTheDocument();
  });

  it("explains an invalid verification link and allows an immediate resend", async () => {
    render(
      await VerifyEmailPage({
        searchParams: Promise.resolve({
          email: "dupla@example.com",
          estado: "verificado",
          error: "INVALID_TOKEN"
        })
      })
    );

    expect(screen.getByRole("status")).toHaveTextContent(/link expirado ou ja usado/i);
    expect(screen.getByRole("button", { name: /reenviar email/i })).toBeEnabled();
    expect(screen.getByText(/solicitar um novo envio agora/i)).toBeInTheDocument();
  });

  it("requests the original email when verification context is missing", async () => {
    render(await VerifyEmailPage());

    expect(screen.getByLabelText(/email pendente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email cadastrado/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/corrigir email/i)).toBeInTheDocument();
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
