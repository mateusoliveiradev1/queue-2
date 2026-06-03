import "server-only";

import { Resend } from "resend";

type AuthEmailUser = {
  email: string;
  name?: string | null;
};

type AuthEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type AuthEmailEnv = NodeJS.ProcessEnv;

export async function sendVerificationEmail({
  user,
  url
}: {
  user: AuthEmailUser;
  url: string;
}) {
  await sendAuthEmail({
    to: user.email,
    subject: "Verifique seu email - QUEUE/2",
    text: [
      `Oi${formatName(user.name)},`,
      "confirme seu email para entrar na fila da dupla.",
      `Link de verificacao: ${url}`,
      "Se voce nao pediu isso, ignore esta mensagem."
    ].join("\n\n"),
    html: renderEmailHtml({
      title: "Verifique seu email",
      lead: "Confirme seu email para seguir ate o pareamento da dupla.",
      cta: "Verificar email",
      url
    })
  });
}

export async function sendPasswordResetEmail({
  user,
  url
}: {
  user: AuthEmailUser;
  url: string;
}) {
  await sendAuthEmail({
    to: user.email,
    subject: "Redefinir senha - QUEUE/2",
    text: [
      `Oi${formatName(user.name)},`,
      "use o link abaixo para redefinir sua senha.",
      `Link de recuperacao: ${url}`,
      "Se voce nao pediu isso, ignore esta mensagem."
    ].join("\n\n"),
    html: renderEmailHtml({
      title: "Redefinir senha",
      lead: "Use este link para voltar a acessar a fila da dupla.",
      cta: "Redefinir senha",
      url
    })
  });
}

export async function sendAuthEmail(input: AuthEmailInput, env: AuthEmailEnv = process.env) {
  const apiKey = requireEmailEnv(env, "RESEND_API_KEY");
  const from = requireEmailEnv(env, "EMAIL_FROM");
  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html
  });
}

function requireEmailEnv(env: AuthEmailEnv, name: "RESEND_API_KEY" | "EMAIL_FROM"): string {
  const value = env[name];

  if (!value) {
    throw new Error(`${name} is required for QUEUE/2 auth email delivery.`);
  }

  return value;
}

function renderEmailHtml({
  cta,
  lead,
  title,
  url
}: {
  cta: string;
  lead: string;
  title: string;
  url: string;
}) {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#17151f;color:#f5f0df;font-family:Arial,sans-serif;">
    <main style="padding:32px;max-width:560px;">
      <p style="font-weight:800;letter-spacing:0.08em;">QUEUE<span style="color:#b6f33a;">/2</span></p>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(lead)}</p>
      <p>
        <a href="${escapeHtml(url)}" style="display:inline-block;background:#b6f33a;color:#17151f;padding:12px 16px;text-decoration:none;font-weight:800;">
          ${escapeHtml(cta)}
        </a>
      </p>
      <p style="color:#c7c0ac;">Se o botao nao funcionar, copie este link: ${escapeHtml(url)}</p>
    </main>
  </body>
</html>`;
}

function formatName(name: string | null | undefined) {
  const normalized = name?.trim();
  return normalized ? `, ${normalized}` : "";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
