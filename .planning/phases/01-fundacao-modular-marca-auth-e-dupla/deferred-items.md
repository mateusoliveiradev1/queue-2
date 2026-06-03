# Deferred Items

| Found During | Item | Reason | Suggested Follow-up |
| --- | --- | --- | --- |
| 01-03 extra `pnpm --filter @queue/web build` sanity check | Next.js warned that Turbopack inferred `C:\Users\Liiiraa` as workspace root because a `package-lock.json` exists outside the project. | Build passed and this warning is caused by host-level workspace detection outside the plan files. | Set an explicit `turbopack.root` in `apps/web/next.config.ts` or remove the unrelated parent lockfile after confirming it is not needed. |
