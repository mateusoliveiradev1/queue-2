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

type AuthEmailTemplateInput = {
  cta: string;
  eyebrow: string;
  lead: string;
  preview: string;
  securityNote: string;
  steps: readonly AuthEmailStep[];
  title: string;
  url: string;
};

type AuthEmailStep = {
  label: string;
  value: string;
};

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
      eyebrow: "Confirmacao de conta",
      lead: "Confirme seu email para liberar o pareamento e comecar a montar a fila da dupla.",
      preview: "Confirme seu email para entrar na fila da dupla.",
      cta: "Verificar email",
      securityNote: "Este link confirma apenas o email desta conta. Ele expira automaticamente e nao deve ser compartilhado.",
      steps: [
        { label: "01", value: "Email confirmado" },
        { label: "02", value: "Dupla liberada" }
      ],
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
      eyebrow: "Seguranca da conta",
      lead: "Use o link seguro para criar uma nova senha e voltar para a fila da dupla.",
      preview: "Use o link seguro para redefinir sua senha QUEUE/2.",
      cta: "Redefinir senha",
      securityNote: "Depois da troca, sessoes antigas sao invalidadas para proteger sua conta.",
      steps: [
        { label: "01", value: "Link seguro" },
        { label: "02", value: "Senha renovada" }
      ],
      url
    })
  });
}

export async function sendAuthEmail(input: AuthEmailInput, env: AuthEmailEnv = process.env) {
  if (shouldUseDevelopmentEmailLog(env)) {
    logDevelopmentAuthEmail(input);
    return;
  }

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

export function shouldUseDevelopmentEmailLog(env: AuthEmailEnv = process.env): boolean {
  return env.NODE_ENV !== "production" && (!env.RESEND_API_KEY || !env.EMAIL_FROM);
}

function logDevelopmentAuthEmail(input: AuthEmailInput) {
  console.info(
    JSON.stringify({
      scope: "queue2.dev-email",
      to: input.to,
      subject: input.subject,
      text: input.text
    })
  );
}

function requireEmailEnv(env: AuthEmailEnv, name: "RESEND_API_KEY" | "EMAIL_FROM"): string {
  const value = env[name];

  if (!value) {
    throw new Error(`${name} is required for QUEUE/2 auth email delivery.`);
  }

  return value;
}

export function renderAuthEmailHtml(input: AuthEmailTemplateInput): string {
  return renderEmailHtml(input);
}

function renderEmailHtml({
  cta,
  eyebrow,
  lead,
  preview,
  securityNote,
  steps,
  title,
  url
}: AuthEmailTemplateInput) {
  const escapedCta = escapeHtml(cta);
  const escapedEyebrow = escapeHtml(eyebrow);
  const escapedLead = escapeHtml(lead);
  const escapedPreview = escapeHtml(preview);
  const escapedSecurityNote = escapeHtml(securityNote);
  const escapedTitle = escapeHtml(title);
  const escapedUrl = escapeHtml(url);
  const renderedSteps = renderEmailSteps(steps);

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta content="IE=edge" http-equiv="X-UA-Compatible">
    <meta content="width=device-width, initial-scale=1" name="viewport">
    <meta content="light dark" name="color-scheme">
    <meta content="light dark" name="supported-color-schemes">
    <meta name="x-apple-disable-message-reformatting">
    <title>${escapedTitle} - QUEUE/2</title>
    <style>
      @media only screen and (max-width: 640px) {
        .queue2-shell { padding: 24px 12px !important; }
        .queue2-card-pad { padding: 26px 20px !important; }
        .queue2-title { font-size: 29px !important; line-height: 32px !important; }
        .queue2-step { display: block !important; width: 100% !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f1ecdf;color:#17151f;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;">
      ${escapedPreview}
    </div>
    <table role="presentation" style="border-collapse:collapse;background:#f1ecdf;margin:0;padding:0;width:100%;" width="100%">
      <tr>
        <td align="center" class="queue2-shell" style="padding:36px 16px;">
          <table role="presentation" style="border-collapse:collapse;max-width:600px;width:100%;" width="100%">
            <tr>
              <td style="padding:0 0 18px 0;">
                <table role="presentation" style="border-collapse:collapse;width:100%;" width="100%">
                  <tr>
                    <td style="vertical-align:middle;width:56px;" width="56">
                      <table aria-label="QUEUE dois" role="presentation" style="background:#17151f;border:1px solid #94ca21;border-collapse:separate;border-radius:8px;height:48px;width:48px;" width="48">
                        <tr>
                          <td align="center" style="color:#b6f33a;font-family:Consolas,'Courier New',monospace;font-size:19px;font-weight:900;line-height:19px;vertical-align:middle;">/2</td>
                        </tr>
                      </table>
                    </td>
                    <td style="vertical-align:middle;">
                      <p style="color:#17151f;font-family:Arial Black,Arial,Helvetica,sans-serif;font-size:20px;font-weight:900;letter-spacing:0;line-height:22px;margin:0;text-transform:uppercase;">QUEUE<span style="color:#7fb900;">/2</span></p>
                      <p style="color:#6d6256;font-family:Consolas,'Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:0.5px;line-height:16px;margin:2px 0 0 0;text-transform:uppercase;">A fila e nossa.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#17151f;border:1px solid #2f2a3a;border-radius:8px;box-shadow:0 18px 45px rgba(23,21,31,0.22);overflow:hidden;padding:0;">
                <table role="presentation" style="border-collapse:collapse;width:100%;" width="100%">
                  <tr>
                    <td style="background:#b6f33a;height:5px;line-height:5px;font-size:1px;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td class="queue2-card-pad" style="padding:32px 32px 22px 32px;">
                      <p style="color:#b6f33a;font-family:Consolas,'Courier New',monospace;font-size:12px;font-weight:900;letter-spacing:0.7px;line-height:16px;margin:0 0 12px 0;text-transform:uppercase;">${escapedEyebrow}</p>
                      <h1 class="queue2-title" style="color:#f8f2df;font-family:Arial Black,Arial,Helvetica,sans-serif;font-size:34px;font-weight:900;letter-spacing:0;line-height:38px;margin:0 0 14px 0;text-transform:uppercase;">${escapedTitle}</h1>
                      <p style="color:#ded6c3;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:26px;margin:0;max-width:520px;">${escapedLead}</p>
                    </td>
                  </tr>
                  <tr>
                    <td class="queue2-card-pad" style="padding:0 32px 28px 32px;">
                      <table role="presentation" style="border-collapse:collapse;width:100%;" width="100%">
                        <tr>
                          ${renderedSteps}
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td class="queue2-card-pad" style="padding:0 32px 34px 32px;">
                      <a href="${escapedUrl}" style="background:#b6f33a;border:1px solid #d5ff6b;border-radius:6px;color:#17151f;display:inline-block;font-family:Consolas,'Courier New',monospace;font-size:15px;font-weight:900;line-height:20px;padding:15px 20px;text-align:center;text-decoration:none;text-transform:uppercase;">${escapedCta}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#211d2b;border-top:1px solid #342f40;padding:24px 32px 28px 32px;">
                      <table role="presentation" style="border-collapse:collapse;width:100%;" width="100%">
                        <tr>
                          <td style="border:1px solid #3a3546;border-radius:6px;padding:16px 18px;">
                            <p style="color:#f8f2df;font-family:Consolas,'Courier New',monospace;font-size:12px;font-weight:900;letter-spacing:0.5px;line-height:16px;margin:0 0 8px 0;text-transform:uppercase;">Nota de seguranca</p>
                            <p style="color:#cfc6b3;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;margin:0;">${escapedSecurityNote}</p>
                          </td>
                        </tr>
                      </table>
                      <p style="color:#c7c0ac;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;margin:18px 0 10px 0;">Se o botao nao funcionar, copie e cole este link no navegador:</p>
                      <p style="color:#b6f33a;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;margin:0;overflow-wrap:anywhere;word-break:break-all;">
                        <a href="${escapedUrl}" style="color:#b6f33a;text-decoration:underline;">${escapedUrl}</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 4px 0 4px;">
                <p style="color:#6f675d;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;margin:0;text-align:center;">Se voce nao pediu este email, ignore a mensagem. Nenhuma acao sera feita sem o link.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderEmailSteps(steps: readonly AuthEmailStep[]) {
  return steps
    .map(
      (step) => `<td class="queue2-step" style="padding:0 10px 10px 0;vertical-align:top;width:50%;" width="50%">
                            <table role="presentation" style="border-collapse:separate;border-spacing:0;width:100%;" width="100%">
                              <tr>
                                <td style="background:#211d2b;border:1px solid #383241;border-radius:6px;padding:14px 15px;">
                                  <p style="color:#b6f33a;font-family:Consolas,'Courier New',monospace;font-size:12px;font-weight:900;letter-spacing:0.5px;line-height:15px;margin:0 0 8px 0;text-transform:uppercase;">${escapeHtml(step.label)}</p>
                                  <p style="color:#f8f2df;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:800;line-height:20px;margin:0;">${escapeHtml(step.value)}</p>
                                </td>
                              </tr>
                            </table>
                          </td>`
    )
    .join("");
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
