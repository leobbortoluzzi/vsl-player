import {
  isPasswordSet,
  setPassword,
  verifyPassword,
  createSession,
  destroySession,
  getSessionFromCookie,
  makeSessionCookie,
  clearSessionCookie,
  requireAuth,
} from './auth';
import { createVideo, getVideo, deleteVideo, getPlayUrl, getThumbnailUrl, isVideoReady } from './bunny';
import { playerPage } from './player';
import { adminPage } from './admin';
import { loginPage } from './login';
import { embedScript } from './embed';

export interface Env {
  VSL_KV: KVNamespace;
  BUNNY_LIBRARY_ID: string;
  BUNNY_API_KEY: string;
}

interface StoredVideo {
  id: string;
  bunnyGuid: string;
  title: string;
  createdAt: string;
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(), ...extraHeaders },
  });
}

function html(body: string, extraHeaders: Record<string, string> = {}): Response {
  return new Response(body, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...extraHeaders },
  });
}

function js(code: string): Response {
  return new Response(code, {
    headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=3600', ...corsHeaders() },
  });
}

function redirect(url: string, extraHeaders: Record<string, string> = {}): Response {
  return new Response(null, { status: 302, headers: { Location: url, ...extraHeaders } });
}

function errorJson(message: string, status = 400, extraHeaders: Record<string, string> = {}): Response {
  return json({ error: message }, status, extraHeaders);
}

interface Route {
  method: string;
  pattern: RegExp;
  handler: (req: Request, env: Env, match: RegExpMatchArray) => Promise<Response>;
  authRequired: boolean;
}

const routes: Route[] = [
  // Public
  { method: 'GET',  pattern: /^\/login\/?$/,             handler: handleLoginPage,   authRequired: false },
  { method: 'GET',  pattern: /^\/embed\/([a-zA-Z0-9-]+)\.js\/?$/, handler: handleEmbedJs, authRequired: false },
  { method: 'GET',  pattern: /^\/embed\/([a-zA-Z0-9-]+)$/, handler: handlePlayer,    authRequired: false },
  { method: 'GET',  pattern: /^\/api\/auth\/status\/?$/,    handler: handleAuthStatus,  authRequired: false },
  { method: 'POST', pattern: /^\/api\/auth\/setup\/?$/,     handler: handleAuthSetup,   authRequired: false },
  { method: 'POST', pattern: /^\/api\/auth\/login\/?$/,     handler: handleAuthLogin,   authRequired: false },

  // Protected
  { method: 'GET',  pattern: /^\/$/,                        handler: handleAdmin,       authRequired: true },
  { method: 'POST', pattern: /^\/api\/auth\/logout\/?$/,    handler: handleAuthLogout,  authRequired: true },
  { method: 'GET',  pattern: /^\/api\/auth\/me\/?$/,        handler: handleAuthMe,      authRequired: true },
  { method: 'GET',  pattern: /^\/api\/videos\/?$/,          handler: handleListVideos,  authRequired: true },
  { method: 'POST', pattern: /^\/api\/videos\/create\/?$/,  handler: handleVideoCreate, authRequired: true },
  { method: 'POST', pattern: /^\/api\/videos\/confirm\/?$/, handler: handleVideoConfirm,authRequired: true },
  { method: 'DELETE', pattern: /^\/api\/videos\/([a-zA-Z0-9-]+)$/, handler: handleDelete, authRequired: true },
  { method: 'POST', pattern: /^\/api\/analytics\/track\/?$/,      handler: handleAnalyticsTrack, authRequired: false },
  { method: 'GET',  pattern: /^\/api\/analytics\/([a-zA-Z0-9-]+)$/, handler: handleAnalyticsGet, authRequired: true },
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    for (const route of routes) {
      if (request.method !== route.method) continue;
      const match = pathname.match(route.pattern);
      if (!match) continue;

      if (route.authRequired) {
        const authed = await requireAuth(request, env.VSL_KV);
        if (!authed) {
          if (route.method === 'GET' && !pathname.startsWith('/api/')) {
            return redirect('/login');
          }
          return errorJson('Unauthorized', 401);
        }
      }

      try {
        return await route.handler(request, env, match);
      } catch (err) {
        console.error('Route error:', err);
        return errorJson(err instanceof Error ? err.message : 'Internal error', 500);
      }
    }

    return errorJson('Not found', 404);
  },
};

// ─── Auth handlers ─────────────────────────────────────────

async function handleLoginPage(_req: Request, _env: Env, _match: RegExpMatchArray): Promise<Response> {
  return html(loginPage());
}

async function handleAuthStatus(_req: Request, env: Env, _match: RegExpMatchArray): Promise<Response> {
  const hasPw = await isPasswordSet(env.VSL_KV);
  return json({ passwordSet: hasPw });
}

async function handleAuthSetup(req: Request, env: Env, _match: RegExpMatchArray): Promise<Response> {
  const alreadySet = await isPasswordSet(env.VSL_KV);
  if (alreadySet) {
    return errorJson('Senha já foi definida', 400);
  }
  const body = await req.json() as { password?: string };
  if (!body.password || typeof body.password !== 'string') {
    return errorJson('Senha é obrigatória');
  }
  try {
    await setPassword(env.VSL_KV, body.password);
  } catch (err) {
    return errorJson(err instanceof Error ? err.message : 'Erro ao definir senha', 400);
  }
  const token = await createSession(env.VSL_KV);
  return json({ success: true }, 200, { 'Set-Cookie': makeSessionCookie(token) });
}

async function handleAuthLogin(req: Request, env: Env, _match: RegExpMatchArray): Promise<Response> {
  const body = await req.json() as { password?: string };
  if (!body.password || typeof body.password !== 'string') {
    return errorJson('Senha é obrigatória');
  }
  const valid = await verifyPassword(env.VSL_KV, body.password);
  if (!valid) {
    return errorJson('Senha incorreta', 401);
  }
  const token = await createSession(env.VSL_KV);
  return json({ success: true }, 200, { 'Set-Cookie': makeSessionCookie(token) });
}

async function handleAuthLogout(req: Request, env: Env, _match: RegExpMatchArray): Promise<Response> {
  const token = getSessionFromCookie(req);
  if (token) await destroySession(env.VSL_KV, token);
  return json({ success: true }, 200, { 'Set-Cookie': clearSessionCookie() });
}

async function handleAuthMe(_req: Request, _env: Env, _match: RegExpMatchArray): Promise<Response> {
  return json({ authenticated: true });
}

// ─── Page handlers ─────────────────────────────────────────

async function handleAdmin(_req: Request, _env: Env, _match: RegExpMatchArray): Promise<Response> {
  return html(adminPage());
}

async function handlePlayer(_req: Request, env: Env, match: RegExpMatchArray): Promise<Response> {
  const videoId = match[1];
  const stored = await env.VSL_KV.get<StoredVideo>(`video:${videoId}`, 'json');

  if (!stored) {
    return html(notFoundHtml(videoId));
  }

  try {
    const video = await getVideo(env.BUNNY_LIBRARY_ID, env.BUNNY_API_KEY, stored.bunnyGuid);

    if (!isVideoReady(video.status)) {
      return html(processingHtml(stored.title, video.status));
    }

    return html(playerPage({
      title: video.title || stored.title,
      videoId: stored.id,
      playUrl: getPlayUrl(env.BUNNY_LIBRARY_ID, stored.bunnyGuid),
      thumbnailUrl: video.thumbnailFileName
        ? getThumbnailUrl(env.BUNNY_LIBRARY_ID, stored.bunnyGuid)
        : '',
    }));
  } catch (err) {
    console.error('Player error:', err);
    return html(processingHtml(stored.title, -1));
  }
}

async function handleEmbedJs(_req: Request, env: Env, match: RegExpMatchArray): Promise<Response> {
  const videoId = match[1];
  const stored = await env.VSL_KV.get<StoredVideo>(`video:${videoId}`, 'json');

  if (!stored) {
    return js(`console.error('VSL Player: vídeo não encontrado (${videoId})');`);
  }

  try {
    const video = await getVideo(env.BUNNY_LIBRARY_ID, env.BUNNY_API_KEY, stored.bunnyGuid);

    if (!isVideoReady(video.status)) {
      return js(`console.warn('VSL Player: vídeo ainda processando (status ${video.status}), recarregue a página em alguns segundos.');`);
    }
  } catch {
    return js(`console.warn('VSL Player: não foi possível verificar status do vídeo, tentando reproduzir assim mesmo.');`);
  }

  return js(embedScript({
    title: stored.title,
    videoId: stored.id,
    libraryId: env.BUNNY_LIBRARY_ID,
    bunnyGuid: stored.bunnyGuid,
  }));
}

// ─── Video API handlers ────────────────────────────────────

async function handleVideoCreate(req: Request, env: Env, _match: RegExpMatchArray): Promise<Response> {
  const body = await req.json() as { title?: string };
  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
    return errorJson('Título é obrigatório');
  }

  const created = await createVideo(env.BUNNY_LIBRARY_ID, env.BUNNY_API_KEY, body.title.trim());
  const videoId = crypto.randomUUID();

  return json({
    videoId,
    bunnyGuid: created.guid,
    libraryId: env.BUNNY_LIBRARY_ID,
    accessKey: env.BUNNY_API_KEY,
  });
}

async function handleVideoConfirm(req: Request, env: Env, _match: RegExpMatchArray): Promise<Response> {
  const body = await req.json() as { id?: string; bunnyGuid?: string };
  if (!body.id || typeof body.id !== 'string') {
    return errorJson('ID do vídeo é obrigatório');
  }
  if (!body.bunnyGuid || typeof body.bunnyGuid !== 'string') {
    return errorJson('Bunny GUID é obrigatório');
  }

  const stored: StoredVideo = {
    id: body.id,
    bunnyGuid: body.bunnyGuid,
    title: body.id,
    createdAt: new Date().toISOString(),
  };

  try {
    const video = await getVideo(env.BUNNY_LIBRARY_ID, env.BUNNY_API_KEY, body.bunnyGuid);
    stored.title = video.title || body.id;
  } catch {
    // Bunny might still be processing; save with fallback title
  }

  await env.VSL_KV.put(`video:${body.id}`, JSON.stringify(stored));

  return json({ id: body.id, embedUrl: `/embed/${body.id}` }, 201);
}

async function handleListVideos(_req: Request, env: Env, _match: RegExpMatchArray): Promise<Response> {
  const list = await env.VSL_KV.list({ prefix: 'video:' });
  const videos: Array<StoredVideo & { status?: number; length?: number }> = [];

  for (const key of list.keys) {
    const stored = await env.VSL_KV.get<StoredVideo>(key.name, 'json');
    if (stored) {
      const entry: StoredVideo & { status?: number; length?: number } = { ...stored };
      try {
        const live = await getVideo(env.BUNNY_LIBRARY_ID, env.BUNNY_API_KEY, stored.bunnyGuid);
        entry.status = live.status;
        entry.length = live.length;
      } catch {
        entry.status = -1;
      }
      videos.push(entry);
    }
  }

  videos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return json(videos);
}

async function handleDelete(_req: Request, env: Env, match: RegExpMatchArray): Promise<Response> {
  const videoId = match[1];
  const stored = await env.VSL_KV.get<StoredVideo>(`video:${videoId}`, 'json');

  if (!stored) {
    return errorJson('Video not found', 404);
  }

  try {
    await deleteVideo(env.BUNNY_LIBRARY_ID, env.BUNNY_API_KEY, stored.bunnyGuid);
  } catch (err) {
    console.error('Failed to delete from Bunny:', err);
  }

  await env.VSL_KV.delete(`video:${videoId}`);

  return json({ success: true });
}

// ─── Analytics handlers ────────────────────────────────────

interface AnalyticsPayload {
  videoId: string;
  segments: Array<[number, number]>;
  videoLength: number;
}

interface VideoAnalytics {
  totalSessions: number;
  totalWatchSeconds: number;
  totalDurationAvailable: number;
  heatmap: Record<number, number>;
  updatedAt: string;
}

async function handleAnalyticsTrack(req: Request, env: Env, _match: RegExpMatchArray): Promise<Response> {
  let payload: AnalyticsPayload;
  try {
    payload = await req.json() as AnalyticsPayload;
  } catch {
    return errorJson('Invalid JSON');
  }

  if (!payload.videoId || !payload.segments || !Array.isArray(payload.segments)) {
    return errorJson('Missing fields');
  }

  // Read existing analytics
  const raw = await env.VSL_KV.get(`analytics:${payload.videoId}`);
  let analytics: VideoAnalytics;
  if (raw) {
    try {
      analytics = JSON.parse(raw);
    } catch {
      analytics = emptyAnalytics();
    }
  } else {
    analytics = emptyAnalytics();
  }

  // Calculate watch time from segments
  let watchSeconds = 0;
  let maxTime = 0;
  for (const seg of payload.segments) {
    if (seg.length === 2) {
      const dur = seg[1] - seg[0];
      if (dur > 0) watchSeconds += dur;
      if (seg[1] > maxTime) maxTime = seg[1];
    }
  }

  analytics.totalSessions++;
  analytics.totalWatchSeconds += watchSeconds;
  analytics.totalDurationAvailable += payload.videoLength || maxTime || watchSeconds;
  analytics.updatedAt = new Date().toISOString();

  // Update heatmap (5-second buckets)
  for (const seg of payload.segments) {
    if (seg.length !== 2) continue;
    const startBucket = Math.floor(seg[0] / 5);
    const endBucket = Math.floor(seg[1] / 5);
    for (let b = startBucket; b <= endBucket; b++) {
      analytics.heatmap[b] = (analytics.heatmap[b] || 0) + 1;
    }
  }

  // Trim heatmap to prevent KV bloat
  const keys = Object.keys(analytics.heatmap).map(Number);
  if (keys.length > 2000) {
    const sorted = keys.sort((a, b) => a - b);
    const cutoff = sorted[2000];
    const trimmed: Record<number, number> = {};
    for (const k of sorted) {
      if (k <= cutoff) trimmed[k] = analytics.heatmap[k];
    }
    analytics.heatmap = trimmed;
  }

  try {
    await env.VSL_KV.put(`analytics:${payload.videoId}`, JSON.stringify(analytics));
  } catch (err) {
    console.error('Failed to write analytics:', err);
  }

  return json({ success: true });
}

async function handleAnalyticsGet(_req: Request, env: Env, match: RegExpMatchArray): Promise<Response> {
  const videoId = match[1];
  const raw = await env.VSL_KV.get(`analytics:${videoId}`);
  if (!raw) {
    return json({ totalSessions: 0, totalWatchSeconds: 0, totalDurationAvailable: 0, heatmap: {} });
  }
  return json(JSON.parse(raw));
}

function emptyAnalytics(): VideoAnalytics {
  return {
    totalSessions: 0,
    totalWatchSeconds: 0,
    totalDurationAvailable: 0,
    heatmap: {},
    updatedAt: '',
  };
}

// ─── HTML helpers ──────────────────────────────────────────

function notFoundHtml(videoId: string): string {
  return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Vídeo não encontrado</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d1117;color:#c9d1d9;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}.box{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:32px 48px}h1{color:#f0f6fc;font-size:20px;margin-bottom:8px}p{color:#8b949e;font-size:14px}code{background:#21262d;padding:2px 8px;border-radius:4px;font-size:13px}</style>
</head>
<body>
<div class="box"><h1>Vídeo não encontrado</h1><p>ID: <code>${escapeHtml(videoId)}</code></p></div>
</body></html>`;
}

function processingHtml(title: string, status: number): string {
  const msg = status === -1
    ? 'Não foi possível verificar o status do vídeo. Recarregue a página.'
    : 'O vídeo está sendo processado. Esta página atualizará automaticamente.';
  return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} - Processando</title>
${status >= 0 ? '<meta http-equiv="refresh" content="5">' : ''}
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d1117;color:#c9d1d9;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}.box{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:32px 48px}h1{color:#f0f6fc;font-size:20px;margin-bottom:8px}p{color:#8b949e;font-size:14px}.spinner{width:40px;height:40px;border:3px solid rgba(255,255,255,.15);border-top-color:#58a6ff;border-radius:50%;animation:spin .8s linear infinite;margin:16px auto}@keyframes spin{to{transform:rotate(360deg)}}</style>
</head>
<body>
<div class="box"><div class="spinner"></div><h1>${escapeHtml(title)}</h1><p>${msg}</p></div>
</body></html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
