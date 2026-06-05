# AGENTS.md

## Project overview

VSL Player — a Cloudflare Worker that provides a video hosting platform for VSL (Video Sales Letter) landing pages. Uses Bunny.net Stream as the CDN/encoding backend.

## Architecture

Single Worker (`src/index.ts`) serves three roles: REST API, admin panel, and public embed player.

| File | Purpose |
|------|---------|
| `src/index.ts` | Worker entrypoint + route router |
| `src/auth.ts` | Password hashing (SHA-256) + session management |
| `src/bunny.ts` | Bunny.net Stream API client |
| `src/admin.ts` | Admin panel HTML (inline — not a separate deployment) |
| `src/login.ts` | Login/setup page HTML |
| `src/player.ts` | Public embed player HTML with HLS.js |

All page templates are **inline HTML strings generated at request time** — no build step, no static assets. CSS and JS are embedded directly in the template strings.

## Commands

```bash
npm run dev           # Local dev server (wrangler dev)
npx tsc --noEmit      # TypeScript type-check only (no build step)
```

There is no build command, no bundler, no test suite. The Worker is deployed as raw TypeScript — Cloudflare compiles it at deploy time.

## Deploy flow (critical — non-standard)

**This project is NOT deployed via `wrangler deploy`.** It is deployed via the Cloudflare Dashboard from GitHub:

1. Worker code lives on GitHub
2. Cloudflare Dashboard reads the repo and auto-deploys on push
3. `wrangler.jsonc` declares all bindings and env vars so the **Deploy to Cloudflare** button auto-detects them
4. KV bindings and env vars can also be managed in the Cloudflare Dashboard UI under Settings → Variables

## Required dashboard configuration

These must be configured once in the Cloudflare Dashboard for the Worker to function:

| Binding | Name | Type |
|---------|------|------|
| KV namespace binding | `VSL_KV` | KV Namespace (create first in Dashboard → KV) |
| Environment variable | `BUNNY_LIBRARY_ID` | Secret (Bunny Stream library ID) |
| Environment variable | `BUNNY_API_KEY` | Secret (Bunny Stream API key) |

The `compatibility_flags: ["nodejs_compat"]` in `wrangler.jsonc` is required for `crypto.subtle.digest` (used for SHA-256 password hashing).

## KV key schema

```
admin_password     → SHA-256 hash string
session:{token}    → { createdAt, expiresAt } (TTL 24h via expirationTtl)
video:{uuid}       → { id, bunnyGuid, title, createdAt }
```

Sessions are created as UUID tokens with `expirationTtl: 86400` on put — KV auto-expires them.

## Upload flow (direct to Bunny)

Files are NOT proxied through the Worker (avoids 100MB Worker body limit on free plan):

1. `POST /api/videos/create` — Worker calls Bunny API to create video entry, returns `{ videoId, bunnyGuid, libraryId, accessKey }`
2. Browser does HTTP `PUT` directly to `https://video.bunnycdn.com/library/{libraryId}/videos/{bunnyGuid}` with `AccessKey` header
3. `POST /api/videos/confirm` — Worker saves metadata to KV

The Bunny `accessKey` is returned to the browser in step 1. It appears in the Network tab but the admin is behind login.

## Auth

- First access: if `admin_password` key is missing from KV → login page shows setup form
- Password is SHA-256 hashed, stored in KV as hex
- Sessions: random UUID token, `vsl_session` cookie (`HttpOnly; Secure; SameSite=Strict`), 24h TTL
- Protected routes redirect to `/login` for page requests, return 401 for API requests

## Player events (for landing page integration)

The embed player (`/embed/:id`) dispatches events that the parent page can listen to via `postMessage`:

```js
window.addEventListener('message', (e) => {
  // e.data.type → 'player:ready' | 'player:play' | 'player:pause' | 'player:ended' | 'player:timeupdate'
  // e.data.detail.time → current time in seconds (only for timeupdate)
});
```

This is the recommended way to implement CTA delays, scroll-locks, or analytics triggers from the parent landing page.

## Player features

- HLS.js with `maxBufferLength: 10` (chunked loading, prevents full video download)
- `startLevel: -1` (auto quality)
- Native HLS fallback for Safari/iOS
- Muted autoplay (required for modern browser autoplay policies)
- Right-click disabled on the video element
- Automatic thumbnail from Bunny Stream (shown before first play)
