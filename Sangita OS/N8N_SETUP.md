# Phase 2+3 — n8n Automation: Sangita OS → Lead Finder (Search + Verification)

**Architecture**
```
Sangita OS Keyword Pool
        ↓ GET /api/keywords/next
       n8n
         ↓ POST /api/automation/lead-search  {keyword}
Lead Finder API (same engine & DB)
         ↓  discoverYoutubeChannels → saveNewLeads (same DB/files)
LEAD DB (leads.json | Postgres) — extended with verification + approval fields
         ↓
GET /api/automation/lead-search/:jobId  (poll → newLeadIds)
         ↓ POST /api/keywords/{id}/usage search_completed
         ↓
POST /api/automation/verify {leadIds: newLeadIds}  ← Phase 3
         ↓  MockEmailVerifier (or ZeroBounce) → update same LEAD DB
GET /api/automation/verify/:jobId (poll → valid/invalid/risky/unknown → pending_review)
         ↓
Manual Approval (Lead Finder UI)
         ↓
Leads Sheet (approved leads + template) → READY_FOR_BULK_MAIL (no sending)
         ↓
Bulk Mail handoff (read-only, via /api/bulk-mail/templates)
```

No duplicate search engine, no duplicate lead DB. Manual “Find Leads” continues to POST `/api/search` which reuses the same `executeLeadSearch` (`src/lib/automation-search.ts:12`).

---

## 1. API URLs

**Sangita OS (Keyword Pool + Stats Proxy)**
- Base: `https://your-sangita-os.vercel.app` (local: `http://localhost:5173`)
- `GET  /api/keywords` — list pool
- `GET  /api/keywords/next` — next eligible active keyword (**source of daily-target truth**)
- `POST /api/keywords/:id/usage` — usage track `{eventType, leadsFound, newLeads, duplicates, errorMessage}`
- `GET  /api/lead-finder-stats` — read-only proxy to Lead Finder `/api/automation/stats` (for dashboard)

**Lead Finder (Automation + Verification + Sheets)**
- Base: `https://your-lead-finder.vercel.app` (local: `http://localhost:3000`)
- `POST /api/automation/lead-search` — `{keyword: "Bihar News", filters?: {...}}`
- `GET  /api/automation/lead-search/:jobId` — `{jobId, keyword, status, leadsFound, newLeads, duplicates, newLeadIds}`
- `POST /api/automation/verify` — `{leadIds: ["UC..."]}` → `202 {jobId, status:"running", total}`
- `GET  /api/automation/verify/:jobId` — `{jobId, status, total, valid, invalid, risky, unknown}`
- `POST /api/leads/bulk-approve` — `{ids: [...]}` → manual approve
- `POST /api/leads/bulk-reject` — `{ids: [...]}`
- `POST /api/lead-sheets` — `{name, leadIds}` → sheet with verificationSummary
- `PATCH /api/lead-sheets/:id` — `{templateId}` → attach Bulk Mail template → `ready_for_bulk_mail`
- `GET  /api/lead-sheets/:id/handoff` — `{handoff: {sheetId, templateId, leadIds, leads, status:"READY_FOR_BULK_MAIL"}}`
- `GET  /api/bulk-mail/templates` — read-only Bulk Mail templates
- `GET  /api/automation/stats` — read-only for Sangita OS dashboard

---

## 2. Environment Variables

**Sangita OS** (`Sangita OS/.env` / Vercel env):
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
# Phase 1+2 — separate secret for n8n → Sangita OS
KEYWORDS_API_KEY=   # generate: openssl rand -hex 32
# alias: N8N_API_KEY
LEAD_FINDER_BASE_URL=https://lead-finder.vercel.app
LEAD_FINDER_API_KEY=<same as LEAD_FINDER_AUTOMATION_KEY>
```

**Lead Finder** (`Leads/.env.local` / Vercel env):
```
DATABASE_URL=           # or POSTGRES_URL — required in production
YOUTUBE_API_KEY=        # server-only
# Phase 2+3 — separate secret for n8n → Lead Finder (NEVER same as Sangita)
LEAD_FINDER_AUTOMATION_KEY=   # generate: openssl rand -hex 32
# aliases: AUTOMATION_API_KEY, N8N_API_KEY
# Phase 3 — verification (mock works without key)
VERIFICATION_PROVIDER=mock
VERIFICATION_API_KEY=       # only if using zerobounce/hunter (server-only)
BULK_MAIL_BASE_URL=http://localhost:3001  # read-only templates fetch
```

**n8n** (Settings → Variables / Environment):
```
SANGITA_OS_BASE_URL=https://your-sangita-os.vercel.app
SANGITA_OS_API_KEY=<same as KEYWORDS_API_KEY>
LEAD_FINDER_BASE_URL=https://your-lead-finder.vercel.app
LEAD_FINDER_API_KEY=<same as LEAD_FINDER_AUTOMATION_KEY>
```

> **Security:** Two different keys (Sangita → n8n vs n8n → Lead Finder). Never expose in frontend, never log. Server validates `x-api-key` or `Authorization: Bearer`. Rate-limit 30 req/min/IP (`src/lib/rate-limit.ts:4`). Idempotency: same normalized keyword within 5 min returns existing `running` job (`src/lib/automation-jobs.ts:55`, `src/lib/verification-jobs.ts:45`). No provider secrets in responses/logs.

---

## 3. n8n Workflow — Node-by-Node

Import `Leads/n8n/workflow.json` (also at `Sangita OS/n8n/workflow.json`, `n8n/workflow.json`). Version `phase3-1.0.0` has 15 nodes.

| # | Node | Type | Config |
|---|------|------|--------|
| 1 | **Schedule Trigger** | `scheduleTrigger` | Cron `0 */30 * * * *` (every 30 min). Change to `0 0 9 * * *` for 9am daily. |
| 2 | **GET Sangita OS /api/keywords/next** | `httpRequest` | `GET {{SANGITA_OS_BASE_URL}}/api/keywords/next` Headers: `x-api-key: {{SANGITA_OS_API_KEY}}` Timeout 10s `alwaysOutputData:true` |
| 3 | **IF Keyword Available?** | `if` | `{{$json.keyword}} isNotEmpty` → true = continue, false = stop (no keyword = daily targets reached or all paused). |
| 4 | **POST Sangita OS usage: search_started** | `httpRequest` | `POST {{SANGITA_OS_BASE_URL}}/api/keywords/{{ $json.id }}/usage` Body: `{"eventType":"search_started"}` Header `x-api-key` |
| 5 | **POST Lead Finder /api/automation/lead-search** | `httpRequest` | `POST {{LEAD_FINDER_BASE_URL}}/api/automation/lead-search` Body: `{"keyword":"{{ $('GET Sangita OS /api/keywords/next').item.json.keyword }}"}` Header `x-api-key: {{LEAD_FINDER_API_KEY}}` |
| 6 | **Wait 60s** | `wait` | `60 seconds` |
| 7 | **GET Lead Finder job status** | `httpRequest` | `GET {{LEAD_FINDER_BASE_URL}}/api/automation/lead-search/{{ $json.jobId }}` Header `x-api-key` |
| 8 | **IF status == running?** | `if` | `{{$json.status}} == running` → loop back to Wait, else check failed. |
| 9 | **IF status == failed?** | `if` | `{{$json.status}} == failed` → true → POST failed_search, false → POST search_completed |
| 10 | **POST Sangita OS usage: search_completed** | `httpRequest` | `POST {{SANGITA_OS_BASE_URL}}/api/keywords/{{ $('GET Sangita OS /api/keywords/next').item.json.id }}/usage` Body: `{"eventType":"search_completed","leadsFound":{{$json.leadsFound}},"newLeads":{{$json.newLeads}},"duplicates":{{$json.duplicates}}}` |
| 11 | **POST Sangita OS usage: failed_search** | `httpRequest` | Same but `{"eventType":"failed_search","errorMessage":"{{$json.errorMessage}}"`} |
| 12 | **POST Lead Finder /api/automation/verify** *(Phase 3)* | `httpRequest` | `POST {{LEAD_FINDER_BASE_URL}}/api/automation/verify` Body: `{"leadIds":{{$json.newLeadIds}}}` ← from GET job status `newLeadIds`. Header `x-api-key`. |
| 13 | **Wait 30s (verify)** | `wait` | `30 seconds` |
| 14 | **GET Verify job status** | `httpRequest` | `GET {{LEAD_FINDER_BASE_URL}}/api/automation/verify/{{ $json.jobId }}` Header `x-api-key` |
| 15 | **IF verify running?** | `if` | `{{$json.status}} == running` → loop Wait, else stop (leads now `pending_review`, ready for manual approval). |

**Connections:** Schedule → GET next → IF (false) stop, (true) both search_started + POST lead-search → Wait 60s → GET status → IF running → loop Wait 60s, else IF failed → POST failed_search → stop, else POST search_completed → POST verify → Wait 30s → GET verify status → IF running → loop Wait 30s else stop (pending_review). No auto-approve, no Bulk Mail trigger.

**Idempotency:** If Schedule fires twice quickly for same keyword, Lead Finder returns `200 {idempotent:true, jobId}` instead of new job. Same for verify.

---

## 4. Phase 3 — Verification & Sheets APIs

**POST verify**
```bash
curl -X POST -H "x-api-key: $LEAD_FINDER_AUTOMATION_KEY" -H "Content-Type: application/json" \
  -d '{"leadIds":["UC123","UC456"]}' https://lead-finder.vercel.app/api/automation/verify
# 202 {"jobId":"verify_abc","status":"running","total":2}
```

**GET verify status**
```bash
curl -H "x-api-key: $LEAD_FINDER_AUTOMATION_KEY" https://lead-finder.vercel.app/api/automation/verify/verify_abc
# running: {"jobId":"verify_abc","status":"running","total":100,"valid":0,"invalid":0,"risky":0,"unknown":0}
# completed: {"jobId":"verify_abc","status":"completed","total":100,"valid":72,"invalid":15,"risky":8,"unknown":5}
```

**Manual approval (Lead Finder UI or API)**
```bash
curl -X POST -H "Content-Type: application/json" -d '{"ids":["UC123"]}' https://lead-finder.vercel.app/api/leads/bulk-approve
curl -X POST -H "Content-Type: application/json" -d '{"ids":["UC123"]}' https://lead-finder.vercel.app/api/leads/bulk-reject
# valid ≠ approved — must POST approve separately
```

**Leads Sheet**
```bash
curl -X POST -H "Content-Type: application/json" -d '{"name":"Bihar News Outreach - 27 Aug","leadIds":["UC123"]}' https://lead-finder.vercel.app/api/lead-sheets
# {"sheet":{"id":"sheet_...","totalLeads":120,"approvedLeads":95,"verificationSummary":{"valid":72,"invalid":15,...},"status":"draft"}}

curl -X PATCH -H "Content-Type: application/json" -d '{"templateId":1}' https://lead-finder.vercel.app/api/lead-sheets/sheet_... 
# {"sheet":{"templateId":1,"templateName":"Initial Outreach","status":"ready_for_bulk_mail"}}

curl https://lead-finder.vercel.app/api/lead-sheets/sheet_.../handoff
# {"handoff":{"sheetId":"...","templateId":1,"leadIds":[...],"leads":[{id,email,company}],"status":"READY_FOR_BULK_MAIL"}} # read-only, no sending
```

**Bulk Mail templates (read-only)**
```bash
curl https://lead-finder.vercel.app/api/bulk-mail/templates
# {"templates":[{"id":1,"name":"Initial Outreach","category":"Initial Outreach"}, ...]}
```

**Sangita OS stats proxy (read-only)**
```bash
curl https://sangita-os.vercel.app/api/lead-finder-stats
# {"totalLeads":1234,"todayLeads":45,"verification":{"valid":72,...},"approval":{"pending_review":10,"approved":95,"rejected":5}}
```

---

## 5. Example Requests / Responses (Phase 2)

**GET next keyword**
```bash
curl -H "x-api-key: $KEYWORDS_API_KEY" https://sangita-os.vercel.app/api/keywords/next
# 200 {"keyword":"Bihar News","source":"ai","dailyTarget":100,"priority":1,"id":"…","normalizedKeyword":"bihar news","status":"active"}
# 204 {"keyword":null,"message":"No eligible active keyword …"}
```

**POST Lead Finder automation**
```bash
curl -X POST -H "x-api-key: $LEAD_FINDER_AUTOMATION_KEY" -H "Content-Type: application/json" \
  -d '{"keyword":"Bihar News"}' https://lead-finder.vercel.app/api/automation/lead-search
# 202 {"jobId":"abc123","keyword":"Bihar News","status":"running","message":"Search started."}
# Duplicate within 5 min: 200 {"jobId":"abc123","status":"running","idempotent":true}
```

**GET job status**
```bash
curl -H "x-api-key: $LEAD_FINDER_AUTOMATION_KEY" https://lead-finder.vercel.app/api/automation/lead-search/abc123
# running:  {"jobId":"abc123","keyword":"Bihar News","status":"running","leadsFound":0,"newLeads":0,"duplicates":0}
# completed:{"jobId":"abc123","keyword":"Bihar News","status":"completed","leadsFound":120,"newLeads":95,"duplicates":25,"newLeadIds":["UC..."]}
# failed:   {"jobId":"abc123","keyword":"Bihar News","status":"failed","leadsFound":0,"newLeads":0,"duplicates":0,"errorMessage":"YouTube quotaExceeded"}
```

**POST Sangita OS usage**
```bash
curl -X POST -H "x-api-key: $KEYWORDS_API_KEY" -H "Content-Type: application/json" \
  -d '{"eventType":"search_started"}' https://sangita-os.vercel.app/api/keywords/<id>/usage
curl -X POST -H "x-api-key: $KEYWORDS_API_KEY" -H "Content-Type: application/json" \
  -d '{"eventType":"search_completed","leadsFound":120,"newLeads":95,"duplicates":25}' https://sangita-os.vercel.app/api/keywords/<id>/usage
curl -X POST -H "x-api-key: $KEYWORDS_API_KEY" -H "Content-Type: application/json" \
  -d '{"eventType":"failed_search","errorMessage":"quotaExceeded"}' https://sangita-os.vercel.app/api/keywords/<id>/usage
```

**Unauthorized**
```bash
curl https://lead-finder.vercel.app/api/automation/lead-search -d '{"keyword":"x"}' -H "Content-Type: application/json"
# 401 {"error":"Unauthorized","message":"Missing or invalid automation API key..."}
```

---

## 6. How to Test One Keyword Manually

**Without n8n (curl):**
```bash
# 1. Get next
NEXT=$(curl -s -H "x-api-key: $KEYWORDS_API_KEY" $SANGITA_OS_BASE_URL/api/keywords/next)
ID=$(echo $NEXT | jq -r .id)
KW=$(echo $NEXT | jq -r .keyword)
echo "Next: $KW ($ID)"

# 2. Mark started
curl -X POST -H "x-api-key: $KEYWORDS_API_KEY" -H "Content-Type: application/json" \
  -d '{"eventType":"search_started"}' $SANGITA_OS_BASE_URL/api/keywords/$ID/usage

# 3. Start Lead Finder job
JOB=$(curl -s -X POST -H "x-api-key: $LEAD_FINDER_API_KEY" -H "Content-Type: application/json" \
  -d "{\"keyword\":\"$KW\"}" $LEAD_FINDER_BASE_URL/api/automation/lead-search)
JOBID=$(echo $JOB | jq -r .jobId)
echo "Job: $JOBID"

# 4. Poll
curl -H "x-api-key: $LEAD_FINDER_API_KEY" $LEAD_FINDER_BASE_URL/api/automation/lead-search/$JOBID | jq
# wait 60s, repeat until status != running

# 5. Verify (Phase 3)
NEWIDS=$(curl -s -H "x-api-key: $LEAD_FINDER_API_KEY" $LEAD_FINDER_BASE_URL/api/automation/lead-search/$JOBID | jq -r '.newLeadIds | @json')
curl -X POST -H "x-api-key: $LEAD_FINDER_API_KEY" -H "Content-Type: application/json" -d "{\"leadIds\":$NEWIDS}" $LEAD_FINDER_BASE_URL/api/automation/verify | jq
# poll /api/automation/verify/<verifyId> similarly

# 6. Report back
curl -X POST -H "x-api-key: $KEYWORDS_API_KEY" -H "Content-Type: application/json" \
  -d '{"eventType":"search_completed","leadsFound":120,"newLeads":95,"duplicates":25}' \
  $SANGITA_OS_BASE_URL/api/keywords/$ID/usage
```

**In n8n UI:** Create workflow → Import from File → select `workflow.json` → set env vars → Execute Workflow (not Schedule) → check executions log → verify Sangita OS Tasks → Keyword Pool `Total Searches` increments, Lead Finder → pending_review → approve → sheet.

**Manual approval & sheet (UI):** Lead Finder → filter Verification=valid, select → Verify Selected → wait → filter Approval=pending_review → select → Approve → enter Sheet name → Create Sheet → select Template → Attach → Handoff → check READY_FOR_BULK_MAIL (no email sent).

---

## 7. How to Activate Scheduled Workflow

1. **Import:** n8n → Workflows → Import from File → `Leads/n8n/workflow.json` (or drag). Alternatively Import from URL/clipboard.
2. **Credentials:** No OAuth needed. Use *Variables* (`$env.*`). n8n ≥1.0 supports `{{$env.VAR}}` in HTTP Request. Set via: n8n → Settings → Variables → add `SANGITA_OS_BASE_URL`, `SANGITA_OS_API_KEY`, `LEAD_FINDER_BASE_URL`, `LEAD_FINDER_API_KEY`. Or set OS env before starting n8n (`export SANGITA_OS_API_KEY=… n8n start`).
3. **Test without schedule:** Open workflow → click **Execute Workflow** (runs Schedule Trigger manually once).
4. **Activate:** Toggle **Active** switch top-right. Schedule will now fire every 30 min. Adjust cron in node 1 for production (e.g., daily limit: run once per keyword? Daily targets already enforced by Sangita OS — schedule can be frequent).
5. **If n8n not accessible:** Keep workflow inactive and trigger via `curl` loop or cron on server using same HTTP sequence — see Section 6.

**Customization:** Do not add daily-target logic inside n8n. Do not hard-code keywords. All keywords flow dynamically from `GET /api/keywords/next`. Do not auto-approve; manual approval required.

---

## 8. Security Notes

- Two separate keys — compromise of one does not compromise the other.
- Keys never in frontend bundle (`src/lib/automation-auth.ts` server-only, no `NEXT_PUBLIC_` prefix).
- `maskSecret` used for logs (`automation-auth.ts:28`, `verification.ts` never logs key).
- No secrets in API responses — verified by tests `src/lib/__tests__/automation.test.ts:10`, `verification.test.ts:16`.
- `YOUTUBE_API_KEY` and `VERIFICATION_API_KEY` never exposed via automation endpoints; errors sanitized.
- Rate limit inherited from `enforceRateLimit` (30 req/min).

## 9. Verification Checklist (Phase 2+3)

- `npm test` in both `Sangita OS` (36 tests) and `Leads` (27 tests) → pass
- `npm run build` in both → pass (Lead Finder now 21 routes, no UI redesign)
- Manual `POST /api/search` with `{keywords:["Bihar News"]}` still returns `SearchResponse` via same engine
- `GET /api/keywords/next` respects daily targets (returns 204 when all reached)
- `POST /api/automation/verify` sets `valid|invalid|risky|unknown` but leaves `approvalStatus=pending_review`
- `POST /api/leads/bulk-approve` changes to `approved`, `bulk-reject` to `rejected`
- `POST /api/lead-sheets` creates sheet with `verificationSummary`, `PATCH templateId` → `ready_for_bulk_mail`
- `GET /api/lead-sheets/:id/handoff` returns `READY_FOR_BULK_MAIL` only when template + approved, never triggers SMTP
