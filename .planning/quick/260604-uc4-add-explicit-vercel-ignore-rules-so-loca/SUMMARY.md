---
quick_id: 260604-uc4
slug: add-explicit-vercel-ignore-rules-so-loca
status: complete
completed: 2026-06-05T00:50:33.151Z
---

# Summary

Added a root `.vercelignore` so local Turborepo caches, Next build output, package installs, logs, env files and test artifacts are excluded from Vercel CLI uploads.

## Verification

- Confirmed the failed deploy attempted to upload about 6GB because `.turbo` and `apps/web/.next` were present locally.
- Added explicit ignore rules before retrying deploy.
