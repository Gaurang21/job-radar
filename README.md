# ◉ JobRadar

An AI-powered job search platform that parses your resume, fetches relevant jobs from multiple sources, and ranks them by match score using Claude AI.

![JobRadar Screenshot](https://raw.githubusercontent.com/gaurang21/job-radar/main/public/preview.png)

---

## ✨ Features

- **Resume Parsing** — Upload PDF/DOCX, Claude AI extracts skills, titles, experience, education
- **AI Match Scoring** — Every job gets a 0–100 match score vs your profile
- **Multi-Source Jobs** — Adzuna (primary), LinkedIn & Indeed via Apify (secondary)
- **Job Board** — Filter, sort, search with beautiful cards
- **Pipeline (Kanban)** — Drag & drop through Saved → Applied → Interview → Offer
- **Cover Letter AI** — Generate tailored cover letters for any job
- **Email Digest** — Daily top-10 matches sent to your inbox via Resend
- **Browser Extension** — Save jobs from any site with a floating button
- **Persistent SQLite DB** — Profile & jobs survive restarts, no re-upload needed

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/gaurang21/job-radar.git
cd job-radar
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your API keys (see [Getting API Keys](#getting-api-keys) below):

```env
DATABASE_URL="file:./jobradar.db"
ANTHROPIC_API_KEY=sk-ant-...
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key
APIFY_API_TOKEN=apify_api_...
RESEND_API_KEY=re_...          # Optional
DIGEST_EMAIL_TO=you@email.com  # Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Initialize Database

```bash
npx prisma db push
```

### 4. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and upload your resume to get started!

---

## 🔑 Getting API Keys

### Anthropic (Claude AI) — Required
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account and add billing
3. Go to **API Keys** → **Create Key**
4. Copy to `ANTHROPIC_API_KEY`

### Adzuna — Required for job fetching (free)
1. Go to [developer.adzuna.com](https://developer.adzuna.com/)
2. Register for a free account (no credit card needed)
3. Create an app to get `App ID` and `App Key`
4. Copy to `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`
5. **Free tier**: 250 requests/day, resets at midnight UTC

### Apify — Optional (LinkedIn + Indeed scraping)
1. Go to [apify.com](https://apify.com) and sign up
2. Go to **Settings** → **Integrations** → copy your **API Token**
3. Copy to `APIFY_API_TOKEN`
4. **Free tier**: ~$5/month credits included
5. Used actors: LinkedIn Jobs Scraper, Indeed Scraper

### Resend — Optional (email digest)
1. Go to [resend.com](https://resend.com) and sign up
2. Create an API key
3. Copy to `RESEND_API_KEY`
4. Set `DIGEST_EMAIL_TO` to your email address

---

## ☁️ Deploying to Vercel

JobRadar uses SQLite by default (local only). For Vercel, you need a hosted database.

### Option A: Neon PostgreSQL (Recommended — free tier)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project and copy the **Connection String**
3. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"  // ← Change from "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
4. Run `npx prisma generate` to regenerate client
5. Deploy to Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard or CLI:
vercel env add DATABASE_URL
vercel env add ANTHROPIC_API_KEY
vercel env add ADZUNA_APP_ID
vercel env add ADZUNA_APP_KEY
vercel env add APIFY_API_TOKEN
vercel env add NEXT_PUBLIC_APP_URL  # Set to your Vercel URL
```

6. After first deploy, run the migration:
   ```bash
   DATABASE_URL="your_neon_url" npx prisma db push
   ```

### Option B: Vercel Postgres (built-in)

1. In your Vercel project dashboard → **Storage** → **Create Database** → **Postgres**
2. Copy the `DATABASE_URL` from the dashboard
3. Follow the same steps as Option A

### Important Vercel Notes

- File uploads are processed in memory (no disk writes needed)
- The SQLite `.db` file is gitignored — it stays local
- First deploy: run `prisma db push` against your hosted DB
- The `postinstall` script runs `prisma generate` automatically on deploy

---

## 🧩 Browser Extension

Load the `/extension` folder as an unpacked Chrome extension:

1. `chrome://extensions` → Enable Developer Mode
2. **Load Unpacked** → select the `/extension` folder
3. Navigate to a job listing and click the floating "Save to JobRadar" button

See [extension/README.md](extension/README.md) for full instructions.

---

## 🗄️ Database Schema

```
Profile     — Your parsed resume (one record)
Job         — Fetched jobs with AI scores
PipelineItem — Your application stages
Notification — In-app alerts
Setting     — App settings (last fetch, last visit)
```

Run `npm run db:studio` to browse the database visually.

---

## 📁 Project Structure

```
job-radar/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Dashboard
│   │   ├── jobs/page.tsx     # Job board
│   │   ├── pipeline/page.tsx # Kanban board
│   │   ├── profile/page.tsx  # Resume profile
│   │   └── api/              # API routes
│   ├── components/           # React components
│   ├── lib/                  # Core logic
│   └── store/                # Zustand state
├── prisma/
│   └── schema.prisma         # Database schema
├── extension/                # Browser extension
├── .env.example              # Environment template
└── README.md
```

---

## 🔧 Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:push` | Sync schema to database |
| `npm run db:migrate` | Create migration |
| `npm run db:studio` | Open Prisma Studio |

---

## ⚠️ API Error Handling

The app shows clear banners when APIs fail:

- **Anthropic** → Yellow banner: check API key / credits
- **Adzuna** → Yellow banner: check key / daily limit (250 req)
- **Apify** → Yellow banner: check token / credits
- **Resend** → Toast notification

Partial failures still show results from working sources.

---

## 🎨 Design

JobRadar uses a "Deep Signal" dark design system:
- Background: `#030712` (near black)
- Accent: `#06b6d4` (electric cyan)
- Secondary: `#818cf8` (violet)
- Cards: glassmorphism with subtle glow borders

---

## 📝 License

MIT
