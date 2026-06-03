import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy, getSecurityHeaders } from "../src/security/headers";

describe("security response headers", () => {
  it("defines the required production response policy", () => {
    const headers = Object.fromEntries(
      getSecurityHeaders("production").map((header) => [header.key, header.value])
    );

    expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(headers["Content-Security-Policy"]).toContain("upgrade-insecure-requests");
    expect(headers["Strict-Transport-Security"]).toContain("max-age=63072000");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("no-referrer");
  });

  it("does not send HSTS or allow unsafe eval outside the appropriate environment", () => {
    const developmentHeaders = getSecurityHeaders("development");
    const productionCsp = buildContentSecurityPolicy("production");
    const developmentCsp = buildContentSecurityPolicy("development");

    expect(developmentHeaders.some((header) => header.key === "Strict-Transport-Security")).toBe(false);
    expect(productionCsp).not.toContain("'unsafe-eval'");
    expect(developmentCsp).toContain("'unsafe-eval'");
  });

  it("wires the policy into Next config for every route", () => {
    const nextConfigSource = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");

    expect(nextConfigSource).toContain('source: "/(.*)"');
    expect(nextConfigSource).toContain("getSecurityHeaders()");
  });
});

describe("client secret hygiene", () => {
  it("passes the workspace client-source and built-bundle secret scan", () => {
    const output = execFileSync(process.execPath, ["../../scripts/check-secrets.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8"
    });

    expect(output).toContain("Secret scan passed");
  });
});
