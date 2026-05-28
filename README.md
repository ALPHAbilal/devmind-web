# devmind-web

The DevMind frontend — Next.js 15 App Router, deployed to Vercel. The frontend
is a **renderer**, not the brain. All teaching decisions, code execution, and
state transitions happen in the Fly backend; this app's job is to render
whatever the backend says is true, capture learner input, and feel as polished
as the HTML demos at the repo root.

## Quick start

```powershell
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_ANON_KEY from
# Supabase dashboard → Project Settings → API → "anon public" key.

# 3. Run
npm run dev   # http://localhost:3000
```

## Required env vars

| Var | Source | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Safe to ship to browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | RLS-protected; safe to ship |

Both are `NEXT_PUBLIC_*` because they reach the browser. The service-role key
**never** goes here — that lives on the Fly backend only.

## Routes

| Route | Public? | Notes |
|---|---|---|
| `/` | ✅ | Landing |
| `/design-test` | ✅ | Visual verifier for `DESIGN_TOKENS.md` |
| `/login` | ✅ | Email/password sign-in |
| `/signup` | ✅ | Email/password sign-up |
| `/api/auth/callback` | ✅ | Email-confirm code exchange |
| `/api/auth/signout` | ✅ | POST → clear session, redirect to `/login` |
| `/missions/new` | 🔒 | Wizard (stub — Phase 4.1 fills it in) |
| everything else | 🔒 | `middleware.ts` redirects to `/login` |

## Auth flow at a glance

```
/signup ──signUp() ──► Supabase ──email link──► /api/auth/callback?code=…
                                                       │
                                                       ▼
                                          exchangeCodeForSession()
                                                       │
                                                       ▼
                                                /missions/new

/login  ──signInWithPassword()──► Supabase ──► session cookie ──► /missions/new

[any protected route] ──no session──► middleware.ts ──redirect──► /login?next=…
```

DB-side: a trigger on `auth.users` auto-creates the matching `learner_profiles`
row. The frontend MUST NOT insert into `learner_profiles` itself — see
`spec/db/001_initial_schema.sql`.

## Styling: plain CSS, no Tailwind (deliberate)

Every CSS variable, animation timing, and hover state in
`demo-mission-creation.html` / `demo-notebook.html` is the design spec.
Tailwind would force aliasing those tokens and risk visual drift. So:

- Tokens live verbatim in `app/globals.css`, scoped to two theme classes
  (`.theme-mission`, `.theme-notebook`).
- Source of truth for every token: [`DESIGN_TOKENS.md`](./DESIGN_TOKENS.md).
- Decision is documented in [`spec/BUILD_PLAN.md`](../spec/BUILD_PLAN.md)
  under Phase 3 — please don't reintroduce Tailwind.

## Project layout (relevant slices)

```
devmind_web/
├── app/
│   ├── (auth)/login, signup       Auth pages — .theme-mission
│   ├── api/auth/{callback,signout}
│   ├── design-test/               Token verifier
│   ├── missions/new/              Wizard stub
│   ├── globals.css                Tokens + reset
│   └── layout.tsx                 Google Fonts <link>
├── lib/supabase/
│   ├── client.ts                  Browser client
│   ├── server.ts                  Server Component / Route Handler client
│   ├── middleware.ts              Edge middleware helper
│   └── types.ts                   DB type placeholder
├── middleware.ts                  Session refresh + route gate
├── components/                    Empty — populated in 3.4+
└── DESIGN_TOKENS.md
```

## Stack

- Next.js 15.1, React 19, TypeScript strict
- `@supabase/ssr` (0.5.x) for session handling across browser / server / edge
- Turbopack for dev (`next dev --turbo`) — more reliable on Windows
- No Tailwind, no state library — React state + Supabase client is enough
