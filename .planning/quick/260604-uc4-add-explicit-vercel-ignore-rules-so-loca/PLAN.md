---
quick_id: 260604-uc4
slug: add-explicit-vercel-ignore-rules-so-loca
status: complete
created: 2026-06-05T00:50:33.151Z
---

# Add Explicit Vercel Ignore Rules

## Goal

Prevent local cache and build artifacts from being uploaded during Vercel CLI deploys.

## Tasks

- Add `.vercelignore` with explicit local artifact rules.
- Verify the deploy package no longer includes `.turbo`, `.next`, `node_modules`, logs or test output.
- Commit the deploy configuration fix before retrying production deploy.
