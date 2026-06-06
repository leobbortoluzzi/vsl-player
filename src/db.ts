import type { D1Database } from '@cloudflare/workers-types';

export interface AnalyticsRow {
  video_id: string;
  total_sessions: number;
  total_watch_seconds: number;
  total_duration_available: number;
  heatmap: string;
  updated_at: string;
}

export interface AnalyticsData {
  totalSessions: number;
  totalWatchSeconds: number;
  totalDurationAvailable: number;
  heatmap: Record<number, number>;
}

export async function initDb(db: D1Database): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS analytics (
      video_id TEXT PRIMARY KEY,
      total_sessions INTEGER NOT NULL DEFAULT 0,
      total_watch_seconds INTEGER NOT NULL DEFAULT 0,
      total_duration_available INTEGER NOT NULL DEFAULT 0,
      heatmap TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT ''
    )
  `);
}

export async function getAnalytics(db: D1Database, videoId: string): Promise<AnalyticsData> {
  const row = await db
    .prepare('SELECT * FROM analytics WHERE video_id = ?')
    .bind(videoId)
    .first<AnalyticsRow>();

  if (!row) {
    return { totalSessions: 0, totalWatchSeconds: 0, totalDurationAvailable: 0, heatmap: {} };
  }

  let heatmap: Record<number, number> = {};
  try {
    heatmap = JSON.parse(row.heatmap);
  } catch { /* keep empty */ }

  return {
    totalSessions: row.total_sessions,
    totalWatchSeconds: row.total_watch_seconds,
    totalDurationAvailable: row.total_duration_available,
    heatmap,
  };
}

export async function trackAnalytics(
  db: D1Database,
  videoId: string,
  segments: Array<[number, number]>,
  videoLength: number,
): Promise<void> {
  await initDb(db);

  const existing = await db
    .prepare('SELECT * FROM analytics WHERE video_id = ?')
    .bind(videoId)
    .first<AnalyticsRow>();

  let totalSessions = 1;
  let totalWatchSeconds = 0;
  let totalDurationAvailable = videoLength;
  const heatmap: Record<number, number> = {};

  if (existing) {
    totalSessions = existing.total_sessions + 1;
    totalWatchSeconds = existing.total_watch_seconds;
    totalDurationAvailable = existing.total_duration_available + videoLength;
    try {
      const h = JSON.parse(existing.heatmap);
      for (const key of Object.keys(h)) heatmap[Number(key)] = h[key];
    } catch { /* merge into empty */ }
  }

  let watchSeconds = 0;
  let maxTime = 0;
  for (const seg of segments) {
    if (seg.length === 2) {
      const dur = seg[1] - seg[0];
      if (dur > 0) watchSeconds += dur;
      if (seg[1] > maxTime) maxTime = seg[1];
    }
  }
  totalWatchSeconds += watchSeconds;
  if (!totalDurationAvailable) totalDurationAvailable = maxTime || watchSeconds;

  for (const seg of segments) {
    if (seg.length !== 2) continue;
    const startBucket = Math.floor(seg[0] / 5);
    const endBucket = Math.floor(seg[1] / 5);
    for (let b = startBucket; b <= endBucket; b++) {
      heatmap[b] = (heatmap[b] || 0) + 1;
    }
  }

  // Trim heatmap to prevent bloat
  const keys = Object.keys(heatmap).map(Number);
  if (keys.length > 2000) {
    const sorted = keys.sort((a, b) => a - b);
    const cutoff = sorted[2000];
    const trimmed: Record<number, number> = {};
    for (const k of sorted) {
      if (k <= cutoff) trimmed[k] = heatmap[k];
    }
    Object.assign(heatmap, trimmed);
    for (const k of Object.keys(heatmap)) {
      if (Number(k) > cutoff) delete heatmap[Number(k)];
    }
  }

  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO analytics (video_id, total_sessions, total_watch_seconds, total_duration_available, heatmap, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(video_id) DO UPDATE SET
         total_sessions = excluded.total_sessions,
         total_watch_seconds = excluded.total_watch_seconds,
         total_duration_available = excluded.total_duration_available,
         heatmap = excluded.heatmap,
         updated_at = excluded.updated_at`
    )
    .bind(videoId, totalSessions, totalWatchSeconds, totalDurationAvailable, JSON.stringify(heatmap), now)
    .run();
}
