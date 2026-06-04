#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const [, , command, ...args] = process.argv;

if (!command) {
  console.error("Usage: node scripts/with-env-local.mjs <command> [...args]");
  process.exit(1);
}

loadEnvLocal();

const child = spawnCommand(command, args);

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Command terminated by signal ${signal}.`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});

function spawnCommand(executable, executableArgs) {
  if (process.platform === "win32") {
    return spawn(
      "cmd.exe",
      ["/d", "/s", "/c", [executable, ...executableArgs].map(quoteCmdArg).join(" ")],
      {
        stdio: "inherit",
        env: process.env
      }
    );
  }

  return spawn(executable, executableArgs, {
    stdio: "inherit",
    env: process.env
  });
}

function quoteCmdArg(value) {
  if (/^[A-Za-z0-9_./:\\-]+$/.test(value)) {
    return value;
  }

  return `"${value.replaceAll("\"", "\\\"")}"`;
}

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  let content;

  try {
    content = readFileSync(envPath, "utf8");
  } catch {
    return;
  }

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) {
      continue;
    }

    const [, name, rawValue] = match;

    if (process.env[name]) {
      continue;
    }

    process.env[name] = unquote(rawValue.trim());
  }
}

function unquote(value) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
