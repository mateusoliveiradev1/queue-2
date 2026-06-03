import "server-only";

import { createHash } from "node:crypto";

export const PWNED_PASSWORDS_RANGE_API_URL = "https://api.pwnedpasswords.com/range";
export const PWNED_PASSWORDS_PREFIX_LENGTH = 5;

export const passwordBreachCheckPolicy = {
  provider: "haveibeenpwned-pwned-passwords",
  mode: "k-anonymity-sha1-range",
  sends: "sha1-prefix-only",
  prefixLength: PWNED_PASSWORDS_PREFIX_LENGTH,
  defaultProductionEnabled: true,
  defaultDevelopmentEnabled: false,
  unavailableFailMode: "allow-with-structured-warning"
} as const;

export type PasswordBreachCheckResult =
  | {
      checked: true;
      compromised: boolean;
      occurrences: number;
    }
  | {
      checked: false;
      compromised: false;
      occurrences: 0;
      reason: "disabled" | "unavailable";
    };

export type PasswordBreachCheckOptions = {
  fetcher?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
};

export async function checkPasswordBreach(
  password: string,
  options: PasswordBreachCheckOptions = {}
): Promise<PasswordBreachCheckResult> {
  const env = options.env ?? process.env;

  if (!shouldCheckPwnedPasswords(env)) {
    return {
      checked: false,
      compromised: false,
      occurrences: 0,
      reason: "disabled"
    };
  }

  const passwordHash = hashPasswordSha1(password);
  const prefix = passwordHash.slice(0, PWNED_PASSWORDS_PREFIX_LENGTH);
  const suffix = passwordHash.slice(PWNED_PASSWORDS_PREFIX_LENGTH);
  const fetcher = options.fetcher ?? fetch;

  try {
    const response = await fetcher(`${PWNED_PASSWORDS_RANGE_API_URL}/${prefix}`, {
      headers: {
        "Add-Padding": "true",
        "User-Agent": "QUEUE/2 password policy"
      },
      signal: AbortSignal.timeout(options.timeoutMs ?? 2_000)
    });

    if (!response.ok) {
      throw new Error(`pwned_passwords_status_${response.status}`);
    }

    const occurrences = parsePwnedPasswordRangeResponse(await response.text(), suffix);

    return {
      checked: true,
      compromised: occurrences > 0,
      occurrences
    };
  } catch (error) {
    logPasswordBreachCheckUnavailable(error);

    return {
      checked: false,
      compromised: false,
      occurrences: 0,
      reason: "unavailable"
    };
  }
}

export function shouldCheckPwnedPasswords(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV === "test") {
    return env.AUTH_PASSWORD_BREACH_CHECK === "true";
  }

  if (env.NODE_ENV === "production") {
    return env.AUTH_PASSWORD_BREACH_CHECK !== "false";
  }

  return env.AUTH_PASSWORD_BREACH_CHECK === "true";
}

export function hashPasswordSha1(password: string): string {
  return createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
}

export function parsePwnedPasswordRangeResponse(body: string, suffix: string): number {
  const expectedSuffix = suffix.toUpperCase();

  for (const line of body.split(/\r?\n/)) {
    const [candidateSuffix, count] = line.trim().split(":");

    if (candidateSuffix?.toUpperCase() !== expectedSuffix) {
      continue;
    }

    const occurrences = Number.parseInt(count ?? "0", 10);
    return Number.isFinite(occurrences) ? occurrences : 0;
  }

  return 0;
}

function logPasswordBreachCheckUnavailable(error: unknown): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  console.warn(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      scope: "security.audit",
      action: "auth.password_breach_check_unavailable",
      outcome: "allowed",
      error: serializeBreachCheckError(error)
    })
  );
}

function serializeBreachCheckError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.toLowerCase().slice(0, 80);
  }

  return "unknown";
}
