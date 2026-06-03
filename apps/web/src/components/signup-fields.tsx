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
  const failedRules = useMemo(
    () =>
      new Set(
        validateQueuePassword(password, {
          displayName,
          email
        }).failedRules
      ),
    [displayName, email, password]
  );
  const hasPassword = password.length > 0;

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
      </div>
      <ul
        aria-label="Checklist da senha"
        aria-live="polite"
        className="password-checklist"
        id="password-rules"
      >
        {queuePasswordRules.map((rule) => {
          const state = hasPassword
            ? failedRules.has(rule.id)
              ? "unmet"
              : "met"
            : "pending";

          return (
            <li data-rule-state={state} key={rule.id}>
              <RoulettePointer
                aria-hidden="true"
                label=""
                tone={state === "met" ? "primary" : "accent"}
              />
              <span>{rule.label}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
