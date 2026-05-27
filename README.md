# JobRadar — AI-Powered Job Search Platform

JobRadar is a multi-user, AI-powered job search platform built with **Next.js 14**, **Supabase**, and **Claude AI**. It aggregates jobs from multiple sources, scores them against your resume, and provides 10 AI-powered features to accelerate your job search.

## ✨ Features

- **AI Match Scoring** — Every job scored 0–100 against your resume
- **Why You Match** — Explanation of why a job fits your profile
- **Job Summaries** — 5-bullet AI summaries of any job
- **Skill Gap Analysis** — Identify and address missing skills
- **Cover Letter Generator** — Personalized letters with tone selector (formal/friendly/concise)
- **Interview Prep Coach** — 8-10 tailored questions with answer frameworks
- **Outreach Email Drafter** — Cold email drafts with tone control
- **LinkedIn Profile Analyzer** — Score and optimize your LinkedIn profile
- **Market Pulse** — Weekly AI summary of your job market (24h cached)
- **Rejection Pattern Analyzer** — Find patterns after 5+ rejections
- **Kanban Pipeline** — Track applications through all stages
- **Multi-Source Aggregation** — Adzuna + LinkedIn (Apify) + Indeed (Apify)
- **Browser Extension** — Save jobs from any site with one click
- **Email Digest** — Daily top-matches digest via Resend

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/gaurang21/job-radar.git
cd job-radar
npm install
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the entire contents of `supabase/schema.sql`
3. Enable **Email** authentication in Authentication → Providers
4. (Optional) Enable **Google** and/or **GitHub** OAuth in Authentication → Providers

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the values:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Settings → API → service_role key

# Encryption key for API keys (generate a 32-byte hex string)
ENCRYPTION_KEY=your-32-byte-hex-string-here

# AI (optional — users can add their own key in Settings → AI)
ANTHROPIC_API_KEY=sk-ant-...      # Falls back to user's stored key
AI_STUB_MODE=false                 # Set to true for demo/dev without API key

# Job Sources (optional)
ADZUNA_APP_ID=...
ADZUNA_APP_KEY=...
APIFY_API_TOKEN=...

# Email (optional)
RESEND_API_KEY=...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

To generate a secure `ENCRYPTION_KEY`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 🗄️ Database Setup

Run `supabase/schema.sql` in the Supabase SQL Editor. It creates:

| Table | Description |
|-------|-------------|
| `profiles` | User profile data (auto-created on signup) |
| `resumes` | Parsed resume content + file storage path |
| `jobs` | Job listings with AI scores |
| `pipeline_items` | Kanban pipeline entries |
| `pipeline_history` | Stage change audit log |
| `notifications` | In-app notifications |
| `ai_settings` | Per-user AI settings + encrypted API key |
| `market_trends` | Cached market pulse data |
| `settings` | Generic key-value settings per user |

All tables have **Row Level Security (RLS)** — users can only access their own data.

## 🔐 Authentication

Supported auth methods:
- **Email/Password** — Built-in Supabase auth
- **Google OAuth** — Enable in Supabase dashboard
- **GitHub OAuth** — Enable in Supabase dashboard

### OAuth Setup

1. Create OAuth app in Google Cloud Console / GitHub Developer Settings
2. Set callback URL to: `https://your-project.supabase.co/auth/v1/callback`
3. Add credentials to Supabase Authentication → Providers

## 🤖 AI Configuration

### Option A: Platform-wide key (admin)
Set `ANTHROPIC_API_KEY` in environment variables. All users share this key.

### Option B: Per-user keys (recommended)
Users add their own Anthropic API key in **Settings → AI Settings**. Keys are encrypted with AES-256-GCM before storage.

### Development without API key
Set `AI_STUB_MODE=true` — all AI functions return realistic stub data.

## 🌐 Job Sources

### Adzuna (free, 250 req/day)
1. Register at [developer.adzuna.com](https://developer.adzuna.com)
2. Add `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`

### LinkedIn + Indeed via Apify
1. Sign up at [apify.com](https://apify.com) (free tier available)
2. Add `APIFY_API_TOKEN`

## 📦 Browser Extension

The browser extension lets you save any job from any website with one click.

### Install
1. Open Chrome → `chrome://extensions/`
2. Enable **Developer Mode**
3. Click **Load unpacked** → select the `extension/` folder

### Configuration
The extension uses your Supabase JWT for authentication. After logging in to the web app, the extension automatically gets your session token.

## 🚀 Deploy to Vercel

### 1. Push to GitHub
```bash
git push origin main
```

### 2. Import to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import from GitHub: `gaurang21/job-radar`
3. Framework: **Next.js** (auto-detected)

### 3. Add Environment Variables
In Vercel → Project Settings → Environment Variables, add all variables from `.env.local`.

For `NEXT_PUBLIC_APP_URL`, set it to your Vercel deployment URL (e.g., `https://job-radar.vercel.app`).

### 4. Update Supabase Settings
In Supabase → Authentication → URL Configuration:
- **Site URL**: `https://job-radar.vercel.app`
- **Redirect URLs**: `https://job-radar.vercel.app/auth/callback`

### 5. Deploy
Click **Deploy** in Vercel. The build should complete in ~2 minutes.

## 🏗️ Architecture

```
src/
├── app/
│   ├── (auth)/           # Login, signup, OAuth callback
│   ├── (dashboard)/      # Protected routes
│   │   ├── dashboard/    # Main dashboard with stats + widgets
│   │   ├── jobs/         # Job board with filters
│   │   ├── pipeline/     # Kanban board
│   │   ├── profile/      # Resume profile editor
│   │   ├── settings/
│   │   │   ├── ai/       # AI Settings (API key, feature toggles)
│   │   │   └── account/  # Account settings (name, password, digest)
│   │   └── linkedin-analyzer/  # LinkedIn profile analyzer
│   └── api/              # API routes
├── components/
│   ├── ai/               # InterviewPrepModal, EmailDraftModal
│   ├── cover-letter/     # CoverLetterModal
│   ├── jobs/             # JobCard, JobDrawer, JobFilters
│   ├── layout/           # Navbar
│   ├── pipeline/         # KanbanBoard
│   ├── resume/           # ResumeUpload
│   └── ui/               # Badge, Modal, Spinner
├── lib/
│   ├── ai-context.ts     # Resolve AI key (user → env fallback)
│   ├── crypto.ts         # AES-256-GCM encrypt/decrypt
│   └── supabase/         # Browser, server, admin clients
├── services/
│   ├── aiService.ts      # All 10 AI features + stub mode
│   ├── adzunaService.ts  # Adzuna job fetching
│   ├── apifyService.ts   # LinkedIn/Indeed scraping
│   ├── emailService.ts   # Resend email digest
│   └── resumeParser.ts   # PDF/DOCX parsing + AI extraction
└── types/index.ts        # All TypeScript types
```

## 🛡️ Security

- **RLS** on all database tables — users can only access their own data
- **AES-256-GCM** encryption for stored Anthropic API keys
- **Supabase JWT** authentication for all API routes
- **Bearer token auth** for browser extension endpoint
- **No secrets** committed — `.env` is gitignored

## 📄 License

MIT
