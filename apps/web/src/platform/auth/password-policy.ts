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

const commonPasswordFragments = ["senha", "password", "queue2", "12345678", "qwerty", "abcdef"];

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
