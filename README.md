# VSL Player

Video hosting platform for VSL (Video Sales Letter) landing pages. Upload your video, get an embed link, and integrate CTA delays via `postMessage` events.

Built on Cloudflare Workers + Bunny.net Stream.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/leobbortoluzzi/vsl-player)

## Quick start

1. Click **Deploy to Cloudflare Workers** above
2. Authorize Cloudflare to access your GitHub account
3. After deploy, go to your Worker **Settings → Variables** and add:

| Binding | Name | Value |
|---------|------|-------|
| KV Namespace | `VSL_KV` | Create one in **KV** tab first |
| Secret | `BUNNY_LIBRARY_ID` | Your Bunny Stream Library ID |
| Secret | `BUNNY_API_KEY` | Your Bunny Stream API key |

4. Your admin panel is live at your `workers.dev` URL — set your password on first access

## Player embed

```html
<iframe src="https://your-worker.workers.dev/embed/VIDEO_ID"
        style="width:100%; aspect-ratio:16/9; border:none;"></iframe>
```

### CTA delay (pitch at 30 min)

```js
window.addEventListener('message', (e) => {
  if (e.data.type === 'player:timeupdate' && e.data.detail.time >= 1800) {
    document.getElementById('cta-button').style.display = 'block';
  }
});
```

Events: `player:ready`, `player:play`, `player:pause`, `player:ended`, `player:timeupdate`

## Features

- HLS.js with 10s chunked buffer (prevents full video download)
- Muted autoplay + native Safari/iOS fallback
- Auto-generated thumbnail from Bunny Stream
- Upload directly from admin panel (drag & drop)
- Password-protected admin with SHA-256 + session cookies

## Local dev

```bash
npm install
npm run dev           # wrangler dev
npx tsc --noEmit      # type-check
```
