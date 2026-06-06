# AGENTS.md

## Project overview

VSL Player — a Cloudflare Worker that provides a video hosting platform for VSL (Video Sales Letter) landing pages. Uses Bunny.net Stream as the CDN/encoding backend.

## Architecture

Single Worker (`src/index.ts`) serves three roles: REST API, admin panel, and public embed player.

| File | Purpose |
|------|---------|
| `src/index.ts` | Worker entrypoint + route router |
| `src/auth.ts` | Password hashing (SHA-256) + session management |
| `src/bunny.ts` | Bunny.net Stream API client + URL helpers |
| `src/db.ts` | D1 database helpers (analytics) |
| `src/admin.ts` | Admin panel HTML (inline template) |
| `src/login.ts` | Login/setup page HTML |
| `src/player.ts` | Iframe embed player HTML |
| `src/embed.ts` | JS embed script (inline player, like VTurb) |

All page templates are **inline HTML/JS strings** — no build step, no static assets.

## Commands

```bash
npm run dev           # Local dev (wrangler dev)
npx tsc --noEmit      # TypeScript type-check only
```

No build command, no test suite. Worker is deployed as raw TypeScript.

## Deploy flow

This project is designed for **Cloudflare Dashboard + GitHub** deploy:

1. Click "Deploy to Cloudflare Workers" button
2. Cloudflare reads `wrangler.jsonc` for build config + bindings
3. KV namespace auto-created, env vars configured
4. Push to GitHub triggers auto-deploy

## Resources

### KV (auth + sessions)
- `admin_password` → SHA-256 hash
- `session:{token}` → `{ createdAt, expiresAt }` (TTL 24h)
- `video:{uuid}` → `{ id, bunnyGuid, title, createdAt }`

### D1 (analytics)
- Table `analytics`: `video_id TEXT PK`, `total_sessions`, `total_watch_seconds`, `total_duration_available`, `heatmap TEXT` (JSON), `updated_at`
- `src/db.ts` handles `initDb()` (CREATE TABLE IF NOT EXISTS) + upsert via `ON CONFLICT DO UPDATE`
- Free tier: 1M writes/month — no practical limit for VSL traffic

## Bunny.net Stream API notes

- **Playback URLs NOT in API responses** — constructed via `getPlayUrl()` / `getThumbnailUrl()`
- URL: `https://video.bunnycdn.com/play/{libraryId}/{guid}` (redirects to HLS/CDN)
- **Ready status**: `status >= 4` (4 = Finished). Status 1 = Uploaded only
- Use `isVideoReady(status)` helper

## Upload flow (direct to Bunny)

1. `POST /api/videos/create` → creates video on Bunny, returns `{ bunnyGuid, libraryId, accessKey }`
2. Browser PUTs file directly to Bunny (avoids Worker 100MB body limit)
3. `POST /api/videos/confirm` → saves metadata to KV

## Auth

- First access: if `admin_password` missing from KV → setup form
- Password: SHA-256 hex in KV
- Sessions: UUID token, `vsl_session` cookie (HttpOnly; Secure; SameSite=Strict), 24h TTL

## Embed modes

| Route | Type | Events |
|-------|------|--------|
| `/embed/:id.js` | JS script (recommended) | `document` events |
| `/embed/:id` | HTML iframe | `document` events + `postMessage` |

Events: `player:ready`, `player:play`, `player:pause`, `player:ended`, `player:timeupdate` (`{ time: number }`)

## Analytics

Client buffers watch segments locally, sends 1 POST via `sendBeacon` on `beforeunload`/ended. Server aggregates into D1 with 5-second bucket heatmap.
