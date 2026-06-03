import "server-only";

type AuthLogLevel = "debug" | "info" | "warn" | "error";

export const authLogger = {
  disableColors: true,
  level: "warn" as const,
  log(level: AuthLogLevel, message: string, ..._discardedArguments: unknown[]) {
    const record = serializeAuthLogRecord(level, message);

    if (level === "error") {
      console.error(record);
      return;
    }

    console.warn(record);
  }
};

export function serializeAuthLogRecord(level: AuthLogLevel, message: string): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    scope: "better-auth",
    level,
    event: classifyAuthLogMessage(message)
  });
}

function classifyAuthLogMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("rate") && normalized.includes("limit")) {
    return "auth.rate_limit_event";
  }

  if (normalized.includes("verif") || normalized.includes("email")) {
    return "auth.email_verification_event";
  }

  if (normalized.includes("session")) {
    return "auth.session_event";
  }

  if (normalized.includes("database") || normalized.includes("adapter")) {
    return "auth.adapter_event";
  }

  return "auth.runtime_event";
}
