# VSL Player

Video hosting platform for VSL (Video Sales Letter) landing pages. Upload your video, get an embed link, and integrate CTA delays via `postMessage` events.

Built on Cloudflare Workers + Bunny.net Stream.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/leobbortoluzzi/vsl-player)

## Setup

1. Click the **Deploy to Cloudflare Workers** button above
2. Authorize Cloudflare and fill in:
   - **BUNNY_LIBRARY_ID** — your Bunny Stream Library ID
   - **BUNNY_API_KEY** — your Bunny Stream API key
   - **VSL_KV** — will be auto-created or select existing
3. Deploy — your admin panel is live at your `workers.dev` URL
4. First access: set your admin password on the setup screen

## Player embed

```html
<iframe src="https://your-worker.workers.dev/embed/VIDEO_ID"
        style="width:100%; aspect-ratio:16/9; border:none;"></iframe>
```

### CTA delay (e.g. pitch at 30 min)

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
