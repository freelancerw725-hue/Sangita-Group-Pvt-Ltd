# Sangita Group Pvt Ltd - Production-Ready Monorepo

This monorepo contains four interconnected applications for lead generation, email outreach, and business operations.

## Projects

### 1. Leads (Lead Finder) - Next.js
- **Purpose**: YouTube keyword search → lead discovery → Google Sheets sync → email verification
- **Port**: 3000
- **Deploy**: Vercel (recommended)
- **Database**: PostgreSQL (DATABASE_URL) with JSON fallback
- **Key Integrations**: YouTube Data API v3, Google Sheets API, Gmail OAuth, Gemini AI

### 2. Bulk Mail - React + Express + SQLite
- **Purpose**: Campaign management, email queue worker, SMTP sending, tracking
- **Port**: 3001
- **Deploy**: VPS/Server (requires persistent Node worker for email queue)
- **Database**: SQLite (local file) - **NOT suitable for serverless**
- **Key Features**: Email queue worker, daily/hourly limits, sender management, open/click tracking

### 3. Sangita OS - TanStack Start + Supabase
- **Purpose**: Business OS with keyword pool, CRM, project management, AI commands
- **Port**: 5173
- **Deploy**: Cloudflare Workers / Netlify / Vercel (via Nitro)
- **Database**: Supabase (PostgreSQL)
- **Key Features**: Keyword pool for n8n automation, plugin integrations with Leads & Bulk Mail

### 4. n8n Workflows
- **Purpose**: Automation orchestrator connecting all services
- **Workflows**:
  - `workflow.json`: Keyword search + verification (every 30 min)
  - `workflow-scheduled-campaign.json`: Scheduled campaign start (every 5 min)

## Integration Flow

```
Sangita OS (Keyword Pool)
       ↓ n8n (every 30 min)
Leads (YouTube search → deduplication → database)
       ↓ n8n (verification)
Google Sheets (DATA - * tabs)
       ↓ User approval in Leads UI
Leads (Lead Sheets → ready_for_bulk_mail)
       ↓ n8n (every 5 min)
Bulk Mail (Batch import → Campaign → Email queue → SMTP)
```

## Environment Variables

Each project has its own `.env.example` with all required variables. **Never commit real secrets.**

Key shared secrets (generate with `openssl rand -hex 32`):
- `LEAD_FINDER_AUTOMATION_KEY` - n8n → Leads API
- `BULK_MAIL_IMPORT_KEY` - n8n/Leads → Bulk Mail batch import
- `KEYWORDS_API_KEY` - n8n → Sangita OS keyword API

## Quick Start (Local Development)

```bash
# Terminal 1: Leads
cd Leads && npm install && npm run dev

# Terminal 2: Bulk Mail
cd "Bulk Mail" && npm install && npm run dev

# Terminal 3: Sangita OS
cd "Sangita OS" && npm install && npm run dev

# Terminal 4: n8n (import workflows from n8n/ folder)
```

## Production Deployment

### Leads (Vercel)
- Build: `npm run build`
- Start: `npm start`
- Required: DATABASE_URL, YOUTUBE_API_KEY, GOOGLE_SHEET_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_OAUTH_*, LEAD_FINDER_AUTOMATION_KEY

### Bulk Mail (VPS/Docker)
- Build: `npm run build`
- Start: `npm start` (runs Express + email queue worker)
- Required: BULK_MAIL_IMPORT_KEY, LEAD_FINDER_BASE_URL, SMTP credentials
- **Note**: Requires persistent server for email queue worker. Do NOT deploy to Vercel/serverless.

### Sangita OS (Cloudflare/Netlify/Vercel)
- Build: `npm run build`
- Deploy: `npm run deploy` (uses Nitro/Wrangler)
- Required: Supabase credentials, KEYWORDS_API_KEY, LEAD_FINDER_BASE_URL, BULK_MAIL_BASE_URL

### n8n (Self-hosted)
- Import workflows from `n8n/` folder
- Set environment variables matching `.env.example` files

## Database Summary

| Project | Database | Production Ready |
|---------|----------|------------------|
| Leads | PostgreSQL (DATABASE_URL) + JSON fallback | ✅ Yes |
| Bulk Mail | SQLite (local file) | ⚠️ VPS only, not serverless |
| Sangita OS | Supabase (PostgreSQL) | ✅ Yes |

## Security Checklist

- [x] `.env`, `.env.local`, `.env.*.local` in `.gitignore`
- [x] No hardcoded secrets in source code
- [x] `.env.example` files with placeholder values only
- [x] Database files (`*.db`, `data/*.json`) ignored
- [x] Build outputs ignored (`dist/`, `.next/`, `.output/`)
- [x] API keys passed via headers, never in URLs

## Test Results

All projects pass build and test:
- **Bulk Mail**: 116 tests pass
- **Leads**: 51 tests pass
- **Sangita OS**: 50 tests pass

## Next Steps for Live Deployment

1. Create GitHub repository and push this code
2. Set up PostgreSQL database for Leads (Neon, Supabase, Railway, etc.)
3. Configure Supabase project for Sangita OS
4. Set up SMTP credentials for Bulk Mail
5. Deploy each service to its platform
6. Configure n8n with production URLs and secrets
7. Update all `*_BASE_URL` environment variables to production URLs
8. Test full integration flow end-to-end