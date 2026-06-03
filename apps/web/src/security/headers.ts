export type QueueSecurityEnvironment = "development" | "test" | "production";

export type QueueSecurityHeader = {
  key: string;
  value: string;
};

const frameProtection = "DENY";
const contentTypeProtection = "nosniff";
const referrerPolicy = "no-referrer";
const permissionsPolicy = [
  "camera=()",
  "display-capture=()",
  "geolocation=()",
  "microphone=()",
  "payment=()",
  "usb=()"
].join(", ");

export function buildContentSecurityPolicy(
  environment: QueueSecurityEnvironment = resolveEnvironment(process.env.NODE_ENV)
): string {
  const scriptSources = ["'self'", "'unsafe-inline'"];

  if (environment !== "production") {
    scriptSources.push("'unsafe-eval'");
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "media-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:"
  ];

  if (environment === "production") {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function getSecurityHeaders(
  environment: QueueSecurityEnvironment = resolveEnvironment(process.env.NODE_ENV)
): QueueSecurityHeader[] {
  const headers: QueueSecurityHeader[] = [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(environment)
    },
    {
      key: "X-Frame-Options",
      value: frameProtection
    },
    {
      key: "X-Content-Type-Options",
      value: contentTypeProtection
    },
    {
      key: "Referrer-Policy",
      value: referrerPolicy
    },
    {
      key: "Permissions-Policy",
      value: permissionsPolicy
    }
  ];

  if (environment === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload"
    });
  }

  return headers;
}

function resolveEnvironment(value: string | undefined): QueueSecurityEnvironment {
  if (value === "production" || value === "test") {
    return value;
  }

  return "development";
}
