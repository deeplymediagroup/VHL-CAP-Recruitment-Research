# VHL Recruitment Tracker

A comprehensive recruitment tracking system for the Victory Hockey League (VHL). This application automatically ingests and analyzes recruitment data from the VHL Create-a-Player forum.

## Features

### Data Ingestion

- **RSS Polling**: Automatically polls the VHL Create-a-Player RSS feed hourly to detect new topics
- **Historical Backfill**: Scans all 249 pages of the forum to backfill historical recruitment data
- **Light Crawl Safety Net**: Daily light crawl of the first 3 pages as a safety net in case RSS misses items
- **Smart Deduplication**: Prevents duplicate ingestion using topic IDs
- **Season Bucketing**: Automatically assigns recruits to seasons based on creation date

### Dashboard & Analytics

- **KPI Cards**: Total recruits, current season recruits, and top recruitment source
- **Visualizations**:
  - Line chart showing recruits per day (last 30 days)
  - Bar chart showing recruits by source
- **Recruits Search**: Searchable and paginated list of all recruits
- **Admin Panel**: Manage seasons and view ingestion run history

## Architecture

### Tech Stack

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Data Extraction**: Axios, xml2js, and Playwright (for bot protection)
- **Charts**: Recharts
- **Deployment**: Vercel (with Vercel Cron for scheduled jobs)

### Database Schema

- **recruits**: Stores player information and recruitment data
- **seasons**: Season definitions with start/end dates
- **ingestion_runs**: Tracks ingestion job execution and results
- **checkpoints**: Maintains state for resumable ingestion jobs

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Vercel account (for deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd VHL-CAP-Recruitment-Research
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env` and configure:

   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/vhl_recruitment?schema=public"
   CRON_SECRET="your-secret-key-here"
   PLAYWRIGHT_STORAGE_STATE_B64=""  # Optional: for authenticated access
   NODE_ENV="development"
   ```

4. **Set up the database**

   ```bash
   # Generate Prisma client
   npm run db:generate

   # Push schema to database
   npm run db:push

   # Seed initial data (seasons and checkpoints)
   npx ts-node prisma/seed.ts
   ```

5. **Run the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Vercel Deployment

1. **Create a PostgreSQL database**

   Use [Neon](https://neon.tech) or [Supabase](https://supabase.com) for a serverless PostgreSQL database.

2. **Deploy to Vercel**

   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy
   vercel
   ```

3. **Set environment variables in Vercel**

   In your Vercel project settings, add:

   - `DATABASE_URL`: Your PostgreSQL connection string
   - `CRON_SECRET`: A secure random string for protecting cron endpoints
   - `PLAYWRIGHT_STORAGE_STATE_B64`: (Optional) Base64-encoded authentication state

4. **Run database migrations**

   After deployment, run:

   ```bash
   npx prisma db push
   npx ts-node prisma/seed.ts
   ```

5. **Verify cron jobs**

   Vercel will automatically set up cron jobs based on `vercel.json`:
   - RSS Poll: Every hour
   - Light Crawl: Daily at midnight

### Manual Ingestion

You can manually trigger ingestion jobs:

1. **Via Admin Panel**: Visit `/admin` and click the ingestion buttons
2. **Via API**:
   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://your-app.vercel.app/api/ingest/rss
   ```

### Backfill Historical Data

To backfill all historical recruits:

1. Visit `/admin` and click "Run Backfill"
2. Or call the API endpoint repeatedly until complete:
   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://your-app.vercel.app/api/ingest/backfill
   ```

The backfill job processes up to 200 topics per run to avoid timeouts. Run it multiple times (or schedule it nightly) until all 249 pages are processed.

## API Endpoints

### Public Endpoints

- `GET /api/stats`: Dashboard statistics with optional filters
- `GET /api/recruits`: Paginated recruits list with search
- `GET /api/seasons`: List all seasons
- `GET /api/ingestion-runs`: List recent ingestion runs

### Protected Endpoints (Require `CRON_SECRET`)

- `GET /api/ingest/rss`: Run RSS polling job
- `GET /api/ingest/backfill`: Run backfill job
- `GET /api/ingest/light-crawl`: Run light crawl job

## Configuration

### Ingestion Settings

Edit these constants in the respective job files:

**RSS Poll** (`lib/jobs/rss-poll.ts`):
- `RSS_FEED_URL`: The RSS feed URL
- `TOPIC_PAGE_DELAY_MS`: Delay between topic page fetches (default: 2000ms)

**Backfill** (`lib/jobs/backfill.ts`):
- `MAX_FORUM_PAGES`: Total forum pages to scan (default: 249)
- `FORUM_PAGE_DELAY_MS`: Delay between forum page fetches (default: 1500ms)
- `TOPIC_PAGE_DELAY_MS`: Delay between topic page fetches (default: 2000ms)
- `MAX_TOPICS_PER_RUN`: Max topics to process per run (default: 200)
- `MAX_FORUM_PAGES_PER_RUN`: Max pages to scan per run (default: 10)

**Light Crawl** (`lib/jobs/light-crawl.ts`):
- `PAGES_TO_SCAN`: Number of pages to scan (default: 3)

### Playwright Authentication (Optional)

If the VHL forum requires authentication:

1. Run a local Playwright script to login and save authentication state:
   ```javascript
   const { chromium } = require('playwright');
   (async () => {
     const browser = await chromium.launch({ headless: false });
     const context = await browser.newContext();
     const page = await context.newPage();
     await page.goto('https://vhlforum.com/login');
     // Perform login manually...
     await context.storageState({ path: 'storageState.json' });
     await browser.close();
   })();
   ```

2. Base64 encode the storage state:
   ```bash
   cat storageState.json | base64
   ```

3. Set `PLAYWRIGHT_STORAGE_STATE_B64` environment variable with the base64 string

## Troubleshooting

### Playwright Issues on Vercel

Playwright may not work in Vercel's serverless environment due to large binary sizes. If you encounter issues:

1. **Option A**: Use GitHub Actions for ingestion
   - Keep the Next.js dashboard on Vercel
   - Run ingestion jobs via GitHub Actions cron
   - Both read/write from the same PostgreSQL database

2. **Option B**: Use a dedicated server
   - Deploy ingestion jobs to a VPS or container service
   - Keep dashboard on Vercel

### Database Connection Issues

If you get connection errors:

1. Ensure your `DATABASE_URL` is correct
2. For Neon/Supabase, use the pooled connection string
3. Enable SSL if required by your provider

### Cron Jobs Not Running

1. Verify `vercel.json` is committed
2. Check Vercel dashboard > Settings > Cron Jobs
3. Ensure `CRON_SECRET` is set in environment variables
4. Check deployment logs for errors

## License

MIT

---
*VHL Recruitment Tracker - Track recruitment metrics for the Victory Hockey League*

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.
