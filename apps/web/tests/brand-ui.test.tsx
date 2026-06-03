import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";

import SignupPage from "../src/app/(public)/cadastro/page";
import LoginPage from "../src/app/(public)/login/page";
import PairingPage from "../src/app/(public)/parear/page";
import RecoverPasswordPage from "../src/app/(public)/recuperar-senha/page";
import VerifyEmailPage from "../src/app/(public)/verificar-email/page";

afterEach(() => {
  cleanup();
});

describe("public QUEUE/2 route surfaces", () => {
  it("renders login with accessible email and password fields", () => {
    render(createElement(LoginPage));

    expect(screen.getByRole("heading", { name: /entrar na fila da dupla/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
  });

  it("renders signup with progressive password checklist hooks", () => {
    render(createElement(SignupPage));

    expect(screen.getByLabelText(/nome de exibicao/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: /checklist da senha/i })).toBeInTheDocument();
    expect(screen.getByText(/pelo menos 8 caracteres/i)).toBeInTheDocument();
  });

  it("renders verification actions for resend, correction and logout", () => {
    render(createElement(VerifyEmailPage));

    expect(screen.getByRole("button", { name: /reenviar email/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/corrigir email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sair desta conta/i })).toBeInTheDocument();
  });

  it("renders password recovery with neutral reset copy", () => {
    render(createElement(RecoverPasswordPage));

    expect(screen.getByRole("heading", { name: /recuperar senha/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email da conta/i)).toBeInTheDocument();
    expect(screen.getByText(/mensagem e neutra/i)).toBeInTheDocument();
  });

  it("renders pairing create-code mode with copy, validity and neutral errors", () => {
    render(createElement(PairingPage));

    expect(screen.getByRole("button", { name: /criar dupla/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /entrar com codigo/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/codigo de pareamento q2k7m9/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copiar codigo/i })).toBeInTheDocument();
    expect(screen.getByText(/validade: ate amanha/i)).toBeInTheDocument();
    expect(screen.getByText(/codigo invalido/i)).toBeInTheDocument();
    expect(screen.getByText(/codigo nao ativo/i)).toBeInTheDocument();
    expect(screen.getByText(/muitas tentativas/i)).toBeInTheDocument();
  });
});
