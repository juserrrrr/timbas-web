# Timbas Web — Agent Context

## Project Overview
Next.js 14 frontend (App Router) for the Timbas platform. Consumes the `apiTimbas` REST API.
- **Framework:** Next.js 14 (App Router)
- **UI:** Radix UI primitives + Tailwind CSS + shadcn/ui (`components/ui/`)
- **Forms:** react-hook-form + @hookform/resolvers
- **Auth:** JWT stored in cookies (`timbas_token`, `timbas_refresh_token`). Middleware handles route protection.
- **API client:** `lib/api.ts` (`apiFetch` with auto-refresh on 401)
- **Charts:** Recharts + D3

## Project Structure
```
app/
├── layout.tsx              # Root layout
├── page.tsx                # Landing page
├── login/                  # Login page
├── auth/callback/          # Discord OAuth2 callback
├── dashboard/              # Protected area
│   ├── layout.tsx
│   ├── page.tsx
│   ├── match/[matchId]/    # Live match view (SSE)
│   ├── ranking/
│   ├── history/
│   ├── stats/
│   ├── versus/
│   ├── teams/
│   ├── profile/
│   ├── settings/
│   ├── tournaments/        # Brackets for any game (list, [id] with tabs)
│   ├── draft/              # Draft leagues (list, [id] with tabs)
│   └── wallet/             # Coin balance, statement, ranking
└── admin/                  # Admin-only area (role: ADMIN)
    └── score-reader/       # Configure or disable the AI that reads scoreboards

components/
├── ui/                     # shadcn/ui primitives (do not edit unless upgrading)
├── competitions/           # Shared building blocks for tournaments + draft
└── *.tsx                   # Feature components

lib/
├── api.ts                  # apiFetch wrapper (auto token refresh)
├── auth.ts                 # Token get/set/clear (cookie-based)
├── navigation.ts           # Sidebar groups — single source for desktop + mobile nav
└── services/               # API calls per domain (http.ts holds the shared request helper)

middleware.ts               # Route protection: dashboard → needs token, admin → needs ADMIN role
```

## Navigation
`lib/navigation.ts` is the only place nav items live. `dashboard-sidebar.tsx` and
`mobile-bottom-nav.tsx` both read from it — add a page there, not in the components.
Every item carries a `description`; it is shown in the expanded sidebar and in the
collapsed-state tooltip, so write it as "what this page does", not a restated label.

## Server scope
The server selector applies only to match/ranking features. `ServerSelectorSlot`
renders it just for the routes in `SERVER_SCOPED_ROUTES`. Tournaments, draft
leagues, the wallet, profile and settings are platform-wide — never pass a
`serverId` to them.

## Competitions
Tournaments and draft leagues are separate products with separate services and
pages. They share `components/competitions/` (presentational only) and the coin
wallet. Do not make one import from the other's folder.

Screenshots are compressed in the browser by `lib/image-upload.ts` before upload —
never post a raw `File` to the API. Proof images need an auth header, so they are
loaded with `fetchImageObjectUrl` and revoked on unmount, not set as a plain `src`.

## Code Standards

### General
- **No unused imports.** Remove them.
- **No dead code.** Unused components, hooks, or functions → delete.
- **Comments only where non-obvious.** One line, direct.
- **No speculative abstractions.** Don't create hooks or utilities for a single use.

### Components
- Server Components by default. Add `'use client'` only when you need interactivity or browser APIs.
- Keep components focused. If a component exceeds ~150 lines and has distinct sections, split it.
- Props typed with inline `interface` or `type` at the top of the file.
- No `any` types unless wrapping a third-party boundary with no types.

### Data fetching
- Server Components fetch directly (no `useEffect` for initial data).
- Client Components that need real-time data use SSE or `useEffect` with `apiFetch`.
- Always handle loading and error states.
- `apiFetch` handles 401 + auto-refresh — use it for all authenticated requests.

### Auth
- Token reads: use `lib/auth.ts` helpers (`getToken`, `getRefreshToken`, etc.) — never access cookies directly.
- Middleware enforces route protection — do not duplicate that logic in components.
- Never decode JWT on the client for authorization decisions — middleware already handles it.
- The `role` from the token is only for UI hints (show/hide admin links), not for actual access control.

### Security
- Never render raw user input as HTML (`dangerouslySetInnerHTML` is forbidden unless explicitly justified).
- API keys or secrets must never be in `NEXT_PUBLIC_*` variables.
- `NEXT_PUBLIC_API_URL` is the only public env var allowed — it points to the backend.

### Styling
- Use Tailwind utility classes. No inline `style={{}}` unless for dynamic values that Tailwind cannot handle.
- Follow the existing color tokens (CSS variables in `globals.css`). Do not add new hardcoded hex colors.
- shadcn/ui components in `components/ui/` — do not modify them directly; wrap if customization is needed.

### Git
- Commits in English, one line, imperative mood.
- No `Co-Authored-By` lines.

## Agents Available
- **security** — XSS, token exposure, unsafe rendering, auth bypass risks
- **frontend** — Component structure, data fetching patterns, Tailwind/shadcn standards
- **code-review** — Dead code, unused imports, comment quality
- **finish** — Orchestrator: runs security + frontend + code-review after a feature is done
