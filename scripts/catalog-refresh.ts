#!/usr/bin/env node

const refreshUrl =
  readFlag("--url") ??
  process.env.CATALOG_REFRESH_URL ??
  "http://localhost:3000/api/jobs/catalog/refresh";
const cronSecret = process.env.CRON_SECRET;

if (!cronSecret?.trim()) {
  throw new Error("CRON_SECRET is required to trigger the catalog refresh endpoint.");
}

const response = await fetch(refreshUrl, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${cronSecret}`
  }
});
const body = await response.text();

try {
  console.log(JSON.stringify(JSON.parse(body), null, 2));
} catch {
  console.log(body);
}

if (!response.ok) {
  process.exitCode = 1;
}

function readFlag(name: string): string | null {
  const valueFlag = process.argv.find((arg) => arg.startsWith(`${name}=`));

  if (valueFlag) {
    return valueFlag.slice(name.length + 1);
  }

  const index = process.argv.indexOf(name);
  const next = index >= 0 ? process.argv[index + 1] : undefined;

  return next && !next.startsWith("--") ? next : null;
}
