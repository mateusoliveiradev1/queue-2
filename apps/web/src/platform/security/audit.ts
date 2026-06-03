import "server-only";

type SecurityAuditEvent =
  | {
      action: "auth.session_revoked";
      actorUserId: string;
      outcome: "revoked" | "not-found";
    }
  | {
      action: "duo.pairing_attempt";
      actorUserId: string;
      outcome:
        | "paired"
        | "invalid"
        | "inactive"
        | "attempt-limited"
        | "race-lost"
        | "already-paired";
      attemptsRemaining?: number;
    };

export function recordSecurityAuditEvent(event: SecurityAuditEvent): void {
  console.info(serializeSecurityAuditEvent(event));
}

export function serializeSecurityAuditEvent(event: SecurityAuditEvent): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    scope: "security.audit",
    ...event
  });
}
