# SwiftGrowthDigital Lead Finder Dashboard

Production-ready lead discovery dashboard for finding YouTube channel leads, persisting them in Postgres, sending Gmail outreach, exporting CSV/Excel, and syncing qualified leads to Google Sheets.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Fill in the values in `.env.local`:

- `DATABASE_URL` or `POSTGRES_URL`
- `YOUTUBE_API_KEY`
- `GOOGLE_SHEET_ID`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- Gmail OAuth variables if you use Send Mail:
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
  - `GOOGLE_OAUTH_REDIRECT_URI`
  - `GMAIL_FROM_ADDRESS`
- Optional demo automation links:
  - `DEMO_1_LINK`
  - `DEMO_2_LINK`
  - `PORTFOLIO_PDF_LINK`

## Google Sheets setup

1. Create a Google Cloud service account.
2. Enable the Google Sheets API.
3. Download the service account credentials.
4. Share the target Google Sheet with the service account email.
5. Set `GOOGLE_SHEET_ID` to the spreadsheet ID from the sheet URL.

The app will create a worksheet tab automatically if it does not exist.

## YouTube API setup

1. Enable the YouTube Data API v3 in Google Cloud.
2. Create an API key.
3. Put the key in `YOUTUBE_API_KEY`.

## Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

Without `DATABASE_URL` or `POSTGRES_URL`, local development falls back to JSON files in `data/`. Production requires Postgres so leads, search history, Gmail tokens, and email events survive redeployments.

## Deploy on Vercel

1. Create or connect a Vercel Postgres, Neon, Supabase, or other hosted PostgreSQL database.
2. Add `DATABASE_URL` or `POSTGRES_URL` in the Vercel project environment variables.
3. Add the YouTube, Google Sheets, Gmail, and optional Gemini variables from `.env.example`.
4. Set `GOOGLE_OAUTH_REDIRECT_URI` to `https://YOUR_DOMAIN/api/gmail/callback`.
5. Share the Google Sheet with the service account email.
6. Deploy with `vercel --prod` or from the Vercel dashboard.

## Notes

- Search history and saved leads are stored in Postgres in production.
- Duplicate channel IDs are skipped.
- CSV and Excel exports are available from the dashboard.
- Gmail demo replies can include Drive links when the optional demo link variables are set.
