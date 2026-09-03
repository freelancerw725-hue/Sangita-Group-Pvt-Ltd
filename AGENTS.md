# Sangita Group — Monorepo AGENTS.md

Four independent projects (no shared package manager workspace). Each has its own `package.json`, `node_modules`, and build/dev commands.

---

## Projects

### Leads (`/Leads/`)
- **Type**: Next.js 16 (App Router), port 3000
- **Database**: PostgreSQL via Supabase (DATABASE_URL) with JSON fallback for dev
- **Deploy**: Vercel
- **Critical env**: DATABASE_URL, YOUTUBE_API_KEY, GOOGLE_SHEET_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_OAUTH_*, LEAD_FINDER_AUTOMATION_KEY
- **Stale copy**: `/Sangita OS/Leads/` is stale (missing @supabase/* deps, no vitest in devDeps) — use root `/Leads/` as canonical
- **Commands**: `npm install && npm run dev`
- **Test**: `npm run test` — vitest, `concurrent: false`, `fileParallelism: false`, 30s timeout
- **Order**: lint → test

### Bulk Mail (`/Bulk Mail/`)
- **Type**: React + Express + SQLite, port 3001
- **Database**: SQLite file must persist (not serverless). `server/data/crm.db`
- **Deploy**: VPS/Docker
- **Critical env**: BULK_MAIL_IMPORT_KEY, LEAD_FINDER_BASE_URL, SMTP credentials
- **Commands**: `npm install && npm run dev`
- **Test**: `npm run test` — Node native runner, `--test-concurrency=1`
- **Must run on persistent server**. Email queue worker runs in-process. Run `npm run migrate` before first `npm start`.

### Sangita OS (`/Sangita OS/`)
- **Type**: TanStack Start + Supabase, port 5173
- **Database**: Supabase (PostgreSQL) required
- **Deploy**: Cloudflare/Netlify/Vercel
- **Connected to Lovable** — do not force-push or rewrite history; commits sync back and will overwrite user history
- **Critical env**: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, KEYWORDS_API_KEY, LEAD_FINDER_BASE_URL, BULK_MAIL_BASE_URL
- **Commands**: `npm install && npm run dev`
- **Test**: `npm run test` — vitest

### n8n (`/n8n/`)
- **Type**: Workflow JSONs for automation and cross-project orchestration
- **Key schedules**: Keyword search cron `0 */30 * * * *` (every 30 min); Campaign start cron `*/5 * * * *` (every 5 min)
- **Wait nodes**: 60s after search start, 30s after verify start. Poll job status until `status !== "running"`

---

## Integration Flow (n8n is the only cross-project connector)

```
Sangita OS (Keyword Pool)
     ↓ n8n (every 30 min)
Leads (YouTube search → dedup → database)
     ↓ n8n (verification)
Google Sheets (DATA tabs)
     ↓ User approval in Leads UI
Leads (Lead Sheets → ready_for_bulk_mail)
     ↓ n8n (every 5 min)
Bulk Mail (Batch import → Campaign → Email queue → SMTP)
```

Projects do not call each other directly.

---

## Critical Environment Variables

Shared (generate with `openssl rand -hex 32`):
- `LEAD_FINDER_AUTOMATION_KEY` — n8n → Leads API auth
- `BULK_MAIL_IMPORT_KEY` — n8n/Leads → Bulk Mail batch import auth
- `KEYWORDS_API_KEY` — n8n → Sangita OS keyword pool API auth

Project-specific vars are in each project's `.env.example`. Never commit real secrets.

---

## Key Quirks & Gotchas

- **Bulk Mail**: Must run on persistent server. Email queue worker runs in-process (`server/workers/email-queue.worker.js`). **Cannot deploy to Vercel/serverless**. SQLite DB (`server/data/crm.db`) must persist. Run `npm run migrate` before first `npm start`.
- **Leads**: Next.js 16 breaking changes. APIs, conventions, file structure may differ from older Next.js. Read `node_modules/next/dist/docs/` for current version. Root `/Leads/` is canonical; `/Sangita OS/Leads/` is stale.
- **Sangita OS**: Connected to Lovable. **Do not force-push or rewrite history** on the connected branch; commits sync back and will overwrite user history.
- **n8n**: Workflow cron schedules and wait nodes. Keyword search: cron `0 */30 * * * *` (every 30 min). Campaign start: cron `*/5 * * * *` (every 5 min). Wait nodes: 60s after search start, 30s after verify start. Poll job status until `status !== "running"`.
- **Testing order**: `lint → test` (no typecheck; TypeScript `noEmit` only).

---

## Immediate Actions

1. Ensure each project has an up-to-date `.env.example` and confirm no real secrets are committed.
2. Bulk Mail: run migrations, verify SQLite DB path is in `.gitignore`, and ensure the email-queue worker runs on a persistent host.
3. Leads: confirm `/Leads/` at repo root is the canonical copy; archive or remove the stale `/Sangita OS/Leads/` copy.
4. Add a short monorepo-root README documenting per-project start commands and critical env vars (this file).
5. (Optional) Add lightweight CI that runs lint & tests per project to catch regressions before push.