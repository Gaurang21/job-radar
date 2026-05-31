# JobRadar — CLAUDE.md

This file gives Claude Code the context needed to work on this codebase without asking repetitive questions.

## Project

AI-powered multi-user job search platform. Next.js 14 App Router + Supabase + Claude AI.

Live routes: `/` (landing), `/login`, `/signup`, `/dashboard`, `/jobs`, `/pipeline`, `/profile`, `/ats-checker`, `/settings/ai`, `/settings/account`, `/linkedin-analyzer`.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | **Next.js 14** (App Router, TypeScript) |
| Database / Auth / Storage | **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`) |
| AI | **Anthropic Claude** via `src/services/aiService.ts` |
| Styling | **Tailwind CSS** — custom "Deep Signal" dark design system |
| State | **Zustand** (`src/store/useAppStore.ts`) for UI state |
| Drag-and-drop | `@hello-pangea/dnd` (Kanban) |
| Testing | **Vitest 2** (unit/component) + **Playwright** (E2E) |

---

## Key Conventions

### File locations
```
src/
  app/
    (auth)/          — login, signup, OAuth callback
    (dashboard)/     — all protected pages (layout.tsx provides Navbar)
    api/             — API routes (all use requireUser() from lib/supabase/server.ts)
  components/
    ai/              — InterviewPrepModal, EmailDraftModal
    cover-letter/    — CoverLetterModal
    jobs/            — JobCard, JobDrawer, JobFilters
    layout/          — Navbar
    pipeline/        — KanbanBoard
    resume/          — ResumeUpload
    ui/              — Badge, Modal, Spinner
  hooks/             — Domain hooks: useJobs, usePipeline, useProfile
  lib/
    ai-context.ts    — resolveAIContext(supabase, userId) → { apiKey, settings }
    crypto.ts        — AES-256-GCM encrypt/decrypt for API keys
    date.ts          — Timezone-safe date helpers (ALWAYS use these, never toISOString().slice(0,10))
    supabase/        — client.ts, server.ts (requireUser), admin.ts
  services/
    aiService.ts     — ALL AI features live here; import only from here, never from sub-files
    adzunaService.ts — Adzuna job fetching
    apifyService.ts  — LinkedIn/Indeed via Apify
    emailService.ts  — Resend email digest
    resumeParser.ts  — PDF/DOCX parsing
  store/
    useAppStore.ts   — Zustand: jobs, filters, pipeline, notifications UI state
  tests/
    setup.ts         — Vitest global setup
  types/
    index.ts         — ALL shared TypeScript types
e2e/                 — Playwright specs
```

### Dashboard layout
`src/app/(dashboard)/layout.tsx` renders `<Navbar>` and the background. **Page components must NOT include their own Navbar or outer wrapper div** — just return `<main>`.

### AI service rules
- **Never import `ollamaService`, `groqService`, or any sub-service directly from components.** Always go through `src/services/aiService.ts`.
- Every AI function must have a stub that returns realistic data when `AI_STUB_MODE=true`.
- Every AI call is gated by the user's `ai_settings` feature flags (checked inside the service, not in components).
- Wrap every AI call in try/catch. Core features (logging, pipeline, profile) must never block on AI being unavailable.

### Date handling
**Always use helpers from `src/lib/date.ts`** — never `new Date().toISOString().slice(0, 10)` (that's UTC and shifts the day for non-UTC users).

```ts
import { todayLocalISO, localISO, daysAgoLocalISO } from "@/lib/date";
```

### Supabase patterns
- **Server components / API routes**: `import { requireUser } from "@/lib/supabase/server"` — throws `AuthError` if no session (caught and returned as 401).
- **Client components**: `import { createClient } from "@/lib/supabase/client"`.
- **Bypass RLS (admin ops)**: `import { createAdminClient } from "@/lib/supabase/admin"`.
- All tables have RLS. Every row has `user_id = auth.uid()`.

### TypeScript rules
- Strict mode. No `any` unless absolutely necessary.
- All shared types live in `src/types/index.ts`. Don't redeclare locally.
- DB rows use `snake_case` (matching Postgres columns). UI/API payloads use `camelCase` where appropriate. `rowToProfile()` in `src/lib/utils.ts` converts resume rows.

### UI rules
- The design system uses CSS classes: `glass-card`, `shimmer`, `gradient-text`, `signal-cyan`, `signal-violet`, `signal-surface`, `signal-bg`, `signal-gradient`.
- No raw `<input className="...">` for new form controls — use consistent patterns matching existing components.
- Dark mode only. All color tokens are defined in `tailwind.config.ts`.

---

## Domain Hooks

These hooks encapsulate data fetching and expose clean interfaces to page components. Hooks update the Zustand store where appropriate.

| Hook | File | Purpose |
|---|---|---|
| `useProfile` | `src/hooks/useProfile.ts` | Fetch/update parsed resume profile |
| `useJobs` | `src/hooks/useJobs.ts` | Fetch/filter/paginate jobs |
| `usePipeline` | `src/hooks/usePipeline.ts` | Fetch pipeline items, move stages |

---

## Testing

### Unit / Component (Vitest)
```bash
npm run test          # watch mode
npm run test:run      # single run
npm run typecheck     # tsc --noEmit
```

- Config: `vitest.config.ts`
- Setup: `src/tests/setup.ts`
- Test files: `*.test.ts` / `*.test.tsx` next to source files
- Focus on: pure utils (`date.ts`, `crypto.ts`), AI service stubs, domain hooks

### E2E (Playwright)
```bash
npm run test:e2e
```

- Config: `playwright.config.ts`
- Specs: `e2e/*.spec.ts`
- Uses `AI_STUB_MODE=true` + Supabase test credentials — no real AI calls in E2E

### Pre-commit gate
```bash
npm run test:all   # typecheck + build + vitest + playwright
```

---

## Environment Variables

```
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Encryption (required — 32-byte hex)
ENCRYPTION_KEY=

# AI — platform key (optional; users can add their own in Settings → AI)
ANTHROPIC_API_KEY=
AI_STUB_MODE=false   # set true for dev without API key

# Job Sources (optional)
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
APIFY_API_TOKEN=

# Email (optional)
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate `ENCRYPTION_KEY`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## Development

```bash
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run test       # vitest watch
npm run test:e2e   # playwright
npm run test:all   # full gate
```

Database schema: run `supabase/schema.sql` in the Supabase SQL Editor.

---

## Deployment (Vercel)

1. Import repo from GitHub → Framework: Next.js (auto-detected)
2. Add all env vars in Vercel → Settings → Environment Variables
3. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL
4. In Supabase → Auth → URL Configuration: add your Vercel URL to redirect URLs
5. Push to `main` to deploy
