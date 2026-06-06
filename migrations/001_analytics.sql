CREATE TABLE IF NOT EXISTS analytics (
  video_id TEXT PRIMARY KEY,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  total_watch_seconds INTEGER NOT NULL DEFAULT 0,
  total_duration_available INTEGER NOT NULL DEFAULT 0,
  heatmap TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT ''
);
