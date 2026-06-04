import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDir, "..");

const knownSecretNames = [
  "RAWG_API_KEY",
  "DATABASE_URL",
  "DIRECT_DATABASE_URL",
  "TEST_DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "AUTH_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "CRON_SECRET",
  "DEEPL_API_KEY",
  "OPENAI_API_KEY",
  "GOOGLE_TRANSLATE_API_KEY",
  "AZURE_TRANSLATOR_KEY"
];

const sourceRoots = [
  resolve(workspaceRoot, "apps/web/src"),
  resolve(workspaceRoot, "packages/ui/src")
];
const clientBundleRoots = [resolve(workspaceRoot, "apps/web/.next/static")];
const textExtensions = new Set([".css", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const clientPathFragments = [
  "apps/web/src/components/",
  "apps/web/src/platform/auth/client.",
  "packages/ui/src/"
];

const highRiskLiteralPatterns = [
  {
    label: "non-local PostgreSQL URL with embedded credentials",
    pattern: /postgres(?:ql)?:\/\/[^:\s"'`]+:[^@\s"'`]+@(?!localhost|127\.0\.0\.1)/i
  },
  {
    label: "Resend API key literal",
    pattern: /\bre_[A-Za-z0-9_-]{20,}\b/
  },
  {
    label: "live provider key literal",
    pattern: /\b(?:pk_live|sk_live)_[A-Za-z0-9]{16,}\b/
  },
  {
    label: "private key literal",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
  }
];

const findings = [];
let scannedSourceFiles = 0;
let scannedBundleFiles = 0;

for (const root of sourceRoots) {
  for (const file of await collectTextFiles(root)) {
    const content = await readFile(file, "utf8");
    const displayPath = toDisplayPath(file);
    scannedSourceFiles += 1;

    scanHighRiskLiterals(content, displayPath);

    if (isClientSource(displayPath, content)) {
      scanSecretNames(content, displayPath, "client source");
    }

    scanNextPublicSecretNames(content, displayPath);
  }
}

for (const root of clientBundleRoots) {
  if (!(await pathExists(root))) {
    console.warn(`Secret scan: skipped missing client bundle ${toDisplayPath(root)}.`);
    continue;
  }

  for (const file of await collectTextFiles(root)) {
    const content = await readFile(file, "utf8");
    const displayPath = toDisplayPath(file);
    scannedBundleFiles += 1;
    scanSecretNames(content, displayPath, "client bundle");
    scanHighRiskLiterals(content, displayPath);
  }
}

if (findings.length > 0) {
  console.error("Secret scan failed:");

  for (const finding of findings) {
    console.error(`- ${finding}`);
  }

  process.exitCode = 1;
} else {
  console.log(
    `Secret scan passed: ${scannedSourceFiles} source files and ${scannedBundleFiles} client bundle files checked.`
  );
}

function scanSecretNames(content, displayPath, surface) {
  for (const secretName of knownSecretNames) {
    if (content.includes(secretName)) {
      findings.push(`${surface} ${displayPath} references server-only env name ${secretName}`);
    }
  }
}

function scanNextPublicSecretNames(content, displayPath) {
  for (const secretName of knownSecretNames) {
    if (content.includes(`NEXT_PUBLIC_${secretName}`)) {
      findings.push(`${displayPath} exposes server-only env name as NEXT_PUBLIC_${secretName}`);
    }
  }
}

function scanHighRiskLiterals(content, displayPath) {
  for (const { label, pattern } of highRiskLiteralPatterns) {
    if (pattern.test(content)) {
      findings.push(`${displayPath} contains a ${label}`);
    }
  }
}

function isClientSource(displayPath, content) {
  const normalizedPath = displayPath.replaceAll("\\", "/");
  const hasClientDirective = /^\s*["']use client["'];/m.test(content);

  return hasClientDirective || clientPathFragments.some((fragment) => normalizedPath.includes(fragment));
}

async function collectTextFiles(root) {
  if (!(await pathExists(root))) {
    return [];
  }

  const entries = await readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = resolve(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectTextFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && textExtensions.has(extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function toDisplayPath(path) {
  return relative(workspaceRoot, path) || ".";
}
