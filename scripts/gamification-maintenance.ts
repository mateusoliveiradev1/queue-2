#!/usr/bin/env node

const maintenanceUrl =
  readFlag("--url") ??
  process.env.GAMIFICATION_MAINTENANCE_URL ??
  "http://localhost:3000/api/jobs/gamification/maintenance";
const cronSecret = process.env.CRON_SECRET;

if (!cronSecret?.trim()) {
  throw new Error("CRON_SECRET is required to trigger gamification maintenance.");
}

const response = await fetch(maintenanceUrl, {
  headers: {
    Authorization: `Bearer ${cronSecret}`
  },
  method: "GET"
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
