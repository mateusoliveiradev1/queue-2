#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoots = ["apps/web/src", "packages/ui/src", "packages/db/src"];
const packageRoots = ["apps", "packages"];
const ignoredDirectories = new Set([
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  "dist",
  "build",
  "coverage"
]);
const sourceExtensions = new Set([".ts", ".tsx"]);
const internalModuleLayers = new Set([
  "domain",
  "application",
  "infrastructure",
  "presentation",
  "events"
]);
const browserApiIdentifiers = new Set([
  "window",
  "document",
  "localStorage",
  "sessionStorage",
  "navigator"
]);

const clientForbiddenImports = [
  {
    label: "packages/db",
    matches: (specifier, resolvedPath) =>
      specifier === "@queue/db" ||
      specifier.startsWith("@queue/db/") ||
      normalizedPath(resolvedPath).includes("/packages/db/")
  },
  {
    label: "server-only",
    matches: (specifier) => specifier === "server-only"
  },
  {
    label: "Better Auth server config",
    matches: (specifier) =>
      specifier === "better-auth" ||
      specifier.startsWith("better-auth/adapters") ||
      specifier.startsWith("better-auth/plugins") ||
      specifier.includes("platform/auth/server")
  },
  {
    label: "Drizzle",
    matches: (specifier) => specifier === "drizzle-orm" || specifier.startsWith("drizzle-orm/")
  },
  {
    label: "Neon",
    matches: (specifier) =>
      specifier === "@neondatabase/serverless" ||
      specifier.startsWith("@neondatabase/serverless/")
  },
  {
    label: "pg",
    matches: (specifier) => specifier === "pg" || specifier.startsWith("pg/")
  },
  {
    label: "secret-bearing integration",
    matches: (specifier, resolvedPath) => {
      const combined = `${specifier} ${normalizedPath(resolvedPath)}`.toLowerCase();
      return (
        combined.includes("rawg") ||
        combined.includes("resend") ||
        combined.includes("web-push") ||
        combined.includes("/platform/secrets") ||
        combined.includes("/platform/integrations/server") ||
        combined.includes("/env/server")
      );
    }
  }
];

const domainForbiddenImports = [
  { label: "Next.js", matches: (specifier) => specifier === "next" || specifier.startsWith("next/") },
  { label: "React", matches: (specifier) => specifier === "react" || specifier.startsWith("react/") },
  {
    label: "Drizzle",
    matches: (specifier) => specifier === "drizzle-orm" || specifier.startsWith("drizzle-orm/")
  },
  {
    label: "Better Auth",
    matches: (specifier) => specifier === "better-auth" || specifier.startsWith("better-auth/")
  },
  {
    label: "Neon",
    matches: (specifier) =>
      specifier === "@neondatabase/serverless" ||
      specifier.startsWith("@neondatabase/serverless/")
  },
  { label: "pg", matches: (specifier) => specifier === "pg" || specifier.startsWith("pg/") },
  {
    label: "external server SDK",
    matches: (specifier) =>
      specifier === "resend" ||
      specifier.startsWith("resend/") ||
      specifier === "web-push" ||
      specifier.startsWith("web-push/")
  }
];

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  const violations = [
    ...(await checkSourceFiles()),
    ...(await checkWorkspaceDependencies())
  ];

  if (violations.length > 0) {
    console.error("Architecture check failed:");
    for (const violation of violations) {
      console.error(formatViolation(violation));
    }
    process.exit(1);
  }

  console.log("Architecture check passed.");
}

async function checkSourceFiles() {
  const files = [];
  for (const sourceRoot of sourceRoots) {
    const absoluteRoot = path.join(rootDir, sourceRoot);
    files.push(...(await collectSourceFiles(absoluteRoot)));
  }

  const violations = [];
  for (const filePath of files) {
    const source = await fs.readFile(filePath, "utf8");
    violations.push(...analyzeSourceFile(filePath, source));
  }

  return violations;
}

async function collectSourceFiles(directory) {
  if (!(await pathExists(directory))) {
    return [];
  }

  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

function analyzeSourceFile(filePath, source) {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const relativePath = normalizedPath(path.relative(rootDir, filePath));
  const imports = collectImportSpecifiers(sourceFile);
  const moduleInfo = getModuleInfo(relativePath);
  const violations = [];

  if (moduleInfo) {
    violations.push(...checkCrossModuleDeepImports(relativePath, filePath, moduleInfo, imports));
  }

  if (moduleInfo?.layer === "domain") {
    violations.push(...checkDomainPurity(relativePath, sourceFile, imports));
  }

  if (hasUseClientDirective(sourceFile)) {
    violations.push(...checkClientComponentImports(relativePath, filePath, imports));
  }

  if (relativePath.startsWith("packages/ui/") || relativePath.startsWith("packages/db/")) {
    violations.push(...checkSharedPackageImports(relativePath, filePath, imports));
  }

  return violations;
}

function collectImportSpecifiers(sourceFile) {
  const imports = [];

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push({
        specifier: node.moduleSpecifier.text,
        line: lineOf(sourceFile, node)
      });
    }

    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      imports.push({
        specifier: node.arguments[0].text,
        line: lineOf(sourceFile, node)
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

function checkCrossModuleDeepImports(relativePath, filePath, moduleInfo, imports) {
  const violations = [];

  for (const importInfo of imports) {
    const target = getImportModuleTarget(importInfo.specifier, filePath);
    if (
      target &&
      target.domain !== moduleInfo.domain &&
      internalModuleLayers.has(target.layer)
    ) {
      violations.push({
        file: relativePath,
        line: importInfo.line,
        rule: "module-deep-import",
        detail: `Module "${moduleInfo.domain}" imports "${target.domain}/${target.layer}" internals via "${importInfo.specifier}". Use the target module public index.ts.`
      });
    }
  }

  return violations;
}

function checkDomainPurity(relativePath, sourceFile, imports) {
  const violations = [];

  for (const importInfo of imports) {
    for (const forbidden of domainForbiddenImports) {
      if (forbidden.matches(importInfo.specifier)) {
        violations.push({
          file: relativePath,
          line: importInfo.line,
          rule: "domain-purity",
          detail: `Domain files cannot import ${forbidden.label}: "${importInfo.specifier}".`
        });
      }
    }
  }

  const browserApi = findBrowserApiIdentifier(sourceFile);
  if (browserApi) {
    violations.push({
      file: relativePath,
      line: browserApi.line,
      rule: "domain-browser-api",
      detail: `Domain files cannot use browser API "${browserApi.name}".`
    });
  }

  return violations;
}

function checkClientComponentImports(relativePath, filePath, imports) {
  const violations = [];

  for (const importInfo of imports) {
    const resolvedPath = resolveImportPath(importInfo.specifier, filePath);
    for (const forbidden of clientForbiddenImports) {
      if (forbidden.matches(importInfo.specifier, resolvedPath)) {
        violations.push({
          file: relativePath,
          line: importInfo.line,
          rule: "client-server-boundary",
          detail: `Client Components cannot import ${forbidden.label}: "${importInfo.specifier}".`
        });
      }
    }
  }

  return violations;
}

function checkSharedPackageImports(relativePath, filePath, imports) {
  const violations = [];

  for (const importInfo of imports) {
    const resolvedPath = resolveImportPath(importInfo.specifier, filePath);
    const normalizedResolved = normalizedPath(resolvedPath);
    const specifier = importInfo.specifier;

    if (
      specifier === "@queue/web" ||
      specifier.startsWith("@queue/web/") ||
      specifier.startsWith("@/") ||
      specifier.startsWith("apps/web/") ||
      specifier.startsWith("src/modules/") ||
      normalizedResolved.includes("/apps/web/")
    ) {
      violations.push({
        file: relativePath,
        line: importInfo.line,
        rule: "shared-package-app-import",
        detail: `packages/ui and packages/db cannot import application code: "${specifier}".`
      });
    }
  }

  return violations;
}

async function checkWorkspaceDependencies() {
  const packageJsonPaths = [];
  for (const packageRoot of packageRoots) {
    const absoluteRoot = path.join(rootDir, packageRoot);
    packageJsonPaths.push(...(await collectPackageJsonFiles(absoluteRoot)));
  }

  const violations = [];
  for (const packageJsonPath of packageJsonPaths) {
    const relativePath = normalizedPath(path.relative(rootDir, packageJsonPath));
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
    const dependencyFields = [
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "optionalDependencies"
    ];

    for (const field of dependencyFields) {
      const dependencies = packageJson[field] ?? {};
      for (const [dependencyName, version] of Object.entries(dependencies)) {
        if (dependencyName.startsWith("@queue/") && version !== "workspace:*") {
          violations.push({
            file: relativePath,
            line: 1,
            rule: "workspace-dependency",
            detail: `${field}.${dependencyName} must use "workspace:*", found "${version}".`
          });
        }
      }
    }
  }

  return violations;
}

async function collectPackageJsonFiles(directory) {
  if (!(await pathExists(directory))) {
    return [];
  }

  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectPackageJsonFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name === "package.json") {
      files.push(entryPath);
    }
  }

  return files;
}

function hasUseClientDirective(sourceFile) {
  for (const statement of sourceFile.statements) {
    if (
      ts.isExpressionStatement(statement) &&
      ts.isStringLiteral(statement.expression)
    ) {
      if (statement.expression.text === "use client") {
        return true;
      }
      continue;
    }

    return false;
  }

  return false;
}

function findBrowserApiIdentifier(sourceFile) {
  let found;

  function visit(node) {
    if (found) {
      return;
    }

    if (ts.isIdentifier(node) && browserApiIdentifiers.has(node.text)) {
      found = {
        name: node.text,
        line: lineOf(sourceFile, node)
      };
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return found;
}

function getModuleInfo(relativePath) {
  const match = relativePath.match(
    /^apps\/web\/src\/modules\/([^/]+)(?:\/([^/]+))?/
  );
  if (!match) {
    return null;
  }

  return {
    domain: match[1],
    layer: match[2] ?? "index"
  };
}

function getImportModuleTarget(specifier, filePath) {
  const candidates = [];
  candidates.push(normalizedPath(specifier));

  const resolvedPath = resolveImportPath(specifier, filePath);
  if (resolvedPath) {
    candidates.push(normalizedPath(path.relative(rootDir, resolvedPath)));
  }

  for (const candidate of candidates) {
    const normalizedCandidate = candidate
      .replace(/^@\//, "apps/web/src/")
      .replace(/^src\//, "apps/web/src/")
      .replace(/^apps\/web\//, "apps/web/");
    const match = normalizedCandidate.match(
      /^apps\/web\/src\/modules\/([^/]+)\/([^/]+)(?:\/|$)/
    );

    if (match) {
      return {
        domain: match[1],
        layer: match[2]
      };
    }
  }

  return null;
}

function resolveImportPath(specifier, filePath) {
  if (specifier.startsWith(".")) {
    return path.resolve(path.dirname(filePath), specifier);
  }

  if (specifier.startsWith("@/")) {
    return path.join(rootDir, "apps/web/src", specifier.slice(2));
  }

  if (specifier.startsWith("apps/web/")) {
    return path.join(rootDir, specifier);
  }

  if (specifier.startsWith("src/")) {
    return path.join(rootDir, "apps/web", specifier);
  }

  if (specifier === "@queue/db" || specifier.startsWith("@queue/db/")) {
    return path.join(rootDir, "packages/db/src/index.ts");
  }

  if (specifier === "@queue/ui" || specifier.startsWith("@queue/ui/")) {
    return path.join(rootDir, "packages/ui/src/index.ts");
  }

  return "";
}

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function normalizedPath(value) {
  return value.replaceAll(path.sep, "/");
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function formatViolation(violation) {
  return `- ${violation.file}:${violation.line} [${violation.rule}] ${violation.detail}`;
}
