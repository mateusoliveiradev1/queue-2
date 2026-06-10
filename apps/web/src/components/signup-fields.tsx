"use client";

import { useMemo, useState } from "react";
import { RoulettePointer } from "@queue/ui";

import {
  queuePasswordRules,
  validateQueuePassword
} from "../platform/auth/password-policy";

export function SignupFields() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordValidation = useMemo(
    () =>
      validateQueuePassword(password, {
        displayName,
        email
      }),
    [displayName, email, password]
  );
  const failedRules = useMemo(() => new Set(passwordValidation.failedRules), [passwordValidation]);
  const hasPassword = password.length > 0;
  const completedRuleCount = hasPassword ? queuePasswordRules.length - failedRules.size : 0;
  const firstFailedRuleIndex = queuePasswordRules.findIndex((rule) => failedRules.has(rule.id));
  const passwordReady = hasPassword && passwordValidation.ok;
  const showMatchRule = passwordReady || confirmPassword.length > 0;
  const passwordMatchState =
    confirmPassword.length === 0 ? "pending" : confirmPassword === password ? "met" : "unmet";
  const visiblePasswordRules = queuePasswordRules.filter((rule, index) => {
    if (!hasPassword) {
      return index === 0;
    }

    if (firstFailedRuleIndex === -1) {
      return true;
    }

    return index <= firstFailedRuleIndex;
  });
  const coach = getPasswordCoach({
    completedRuleCount,
    hasPassword,
    passwordReady,
    passwordMatchState,
    showMatchRule
  });

  return (
    <>
      <div className="form-stack">
        <div className="field">
          <label htmlFor="signup-display-name">Nome de exibicao</label>
          <input
            autoComplete="name"
            className="queue2-input"
            id="signup-display-name"
            maxLength={40}
            name="displayName"
            onChange={(event) => setDisplayName(event.currentTarget.value)}
            required
            type="text"
          />
        </div>
        <div className="field">
          <label htmlFor="signup-email">Email</label>
          <input
            autoComplete="email"
            className="queue2-input"
            id="signup-email"
            name="email"
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
            type="email"
          />
        </div>
        <div className="field">
          <label htmlFor="signup-password">Senha</label>
          <input
            aria-describedby="password-rules"
            autoComplete="new-password"
            className="queue2-input"
            id="signup-password"
            name="password"
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
            type="password"
          />
        </div>
        <div className="field">
          <label htmlFor="signup-confirm-password">Confirmar senha</label>
          <input
            aria-describedby="password-rules"
            autoComplete="new-password"
            className="queue2-input"
            id="signup-confirm-password"
            name="confirmPassword"
            onChange={(event) => setConfirmPassword(event.currentTarget.value)}
            required
            type="password"
          />
        </div>
      </div>
      <section className="password-coach" aria-labelledby="password-coach-title">
        <div className="password-coach-heading">
          <p className="eyebrow">Senha segura</p>
          <strong id="password-coach-title">{coach.title}</strong>
          <p className="support-copy">{coach.copy}</p>
        </div>
        <div
          aria-label={`${completedRuleCount} de ${queuePasswordRules.length} regras de senha completas`}
          className="password-meter"
          role="img"
        >
          {queuePasswordRules.map((rule, index) => (
            <span
              aria-hidden="true"
              data-active={index < completedRuleCount ? "true" : "false"}
              key={rule.id}
            />
          ))}
        </div>
        <ul
          aria-label="Checklist da senha"
          aria-live="polite"
          className="password-checklist"
          id="password-rules"
        >
          {visiblePasswordRules.map((rule) => {
            const state = getRuleState(hasPassword, failedRules.has(rule.id));

            return (
              <li data-rule-state={state} key={rule.id}>
                <RoulettePointer
                  aria-hidden="true"
                  label=""
                  tone={state === "met" ? "primary" : "accent"}
                />
                <span>{state === "met" ? `${rule.label} OK` : rule.label}</span>
              </li>
            );
          })}
          {showMatchRule ? (
            <li data-rule-state={passwordMatchState}>
              <RoulettePointer
                aria-hidden="true"
                label=""
                tone={passwordMatchState === "met" ? "primary" : "accent"}
              />
              <span>
                {passwordMatchState === "met"
                  ? "As senhas conferem"
                  : "Confirme a mesma senha"}
              </span>
            </li>
          ) : null}
        </ul>
      </section>
    </>
  );
}

function getRuleState(hasPassword: boolean, failed: boolean): "met" | "pending" | "unmet" {
  if (!hasPassword) {
    return "pending";
  }

  return failed ? "unmet" : "met";
}

function getPasswordCoach({
  completedRuleCount,
  hasPassword,
  passwordReady,
  passwordMatchState,
  showMatchRule
}: {
  completedRuleCount: number;
  hasPassword: boolean;
  passwordReady: boolean;
  passwordMatchState: "met" | "pending" | "unmet";
  showMatchRule: boolean;
}): { copy: string; title: string } {
  if (!hasPassword) {
    return {
      copy: "A ajuda aparece conforme voce digita.",
      title: "Comece pela senha"
    };
  }

  if (!passwordReady) {
    return {
      copy: `${completedRuleCount} de ${queuePasswordRules.length} criterios completos.`,
      title: "Ajuste o proximo criterio"
    };
  }

  if (!showMatchRule || passwordMatchState === "pending") {
    return {
      copy: "A senha base esta pronta. Falta repetir no campo de confirmacao.",
      title: "Senha pronta"
    };
  }

  if (passwordMatchState === "unmet") {
    return {
      copy: "A senha e a confirmacao precisam ficar identicas.",
      title: "Quase la"
    };
  }

  return {
    copy: "Tudo certo para criar a conta. A checagem final continua no servidor.",
    title: "Tudo certo"
  };
}
