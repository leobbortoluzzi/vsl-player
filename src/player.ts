export interface PlayerData {
  title: string;
  videoId: string;
  playUrl: string;
  thumbnailUrl: string;
}

export function playerPage(data: PlayerData): string {
  const { title, videoId, playUrl, thumbnailUrl } = data;

  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #000; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .player-wrap { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
  .player-wrap video { width: 100%; height: 100%; object-fit: contain; outline: none; }
  .poster { position: absolute; inset: 0; background-size: contain; background-repeat: no-repeat; background-position: center; background-color: #000; cursor: pointer; transition: opacity .3s; }
  .poster.hidden { opacity: 0; pointer-events: none; }
  .play-btn { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; background: rgba(0,0,0,.6); border: 3px solid #fff; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform .15s, background .15s; }
  .play-btn:hover { transform: translate(-50%, -50%) scale(1.08); background: rgba(0,0,0,.8); }
  .play-btn::after { content: ''; display: block; width: 0; height: 0; border-left: 28px solid #fff; border-top: 18px solid transparent; border-bottom: 18px solid transparent; margin-left: 6px; }
  .loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 48px; height: 48px; border: 4px solid rgba(255,255,255,.2); border-top-color: #fff; border-radius: 50%; animation: spin .8s linear infinite; display: none; }
  .loader.active { display: block; }
  @keyframes spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
</style>
</head>
<body>
<div class="player-wrap" id="playerWrap">
  <div class="poster${thumbnailUrl ? '' : ' hidden'}" id="poster"${thumbnailUrl ? ` style="background-image:url(${escapeAttr(thumbnailUrl)})"` : ''}>
    <div class="play-btn" id="playBtn"></div>
  </div>
  <video id="videoEl" muted playsinline webkit-playsinline x5-video-player-type="h5" x5-video-orientation="portraint"></video>
  <div class="loader" id="loader"></div>
</div>

<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
<script>
(function() {
  var video = document.getElementById('videoEl');
  var poster = document.getElementById('poster');
  var playBtn = document.getElementById('playBtn');
  var loader = document.getElementById('loader');
  var playUrl = ${JSON.stringify(playUrl)};
  var videoId = ${JSON.stringify(videoId)};
  var HlsCtor = window.Hls;

  function emit(name, detail) {
    var event = new CustomEvent(name, { detail: detail });
    document.dispatchEvent(event);
    try { window.parent.postMessage({ type: name, detail: detail }, '*'); } catch(e) {}
  }

  function showLoader() { loader.classList.add('active'); }
  function hideLoader() { loader.classList.remove('active'); }
  function hidePoster() { poster.classList.add('hidden'); }

  function onPlay() { emit('player:play', {}); hidePoster(); }
  function onPause() { emit('player:pause', {}); }
  function onEnded() { emit('player:ended', {}); }
  function onTimeUpdate() { emit('player:timeupdate', { time: video.currentTime }); }
  function onReady() { emit('player:ready', { player: video }); }

  // ── Analytics tracking ──────────────────────
  var analytics = { segmentStart: -1, segments: [], videoLength: 0, videoId: videoId, sent: false };

  function pushSegment() {
    if (analytics.segmentStart >= 0 && video.currentTime > analytics.segmentStart + 1) {
      analytics.segments.push([Math.floor(analytics.segmentStart), Math.floor(video.currentTime)]);
    }
    analytics.segmentStart = -1;
  }

  function trackPlay() {
    analytics.segmentStart = video.currentTime;
    if (!analytics.videoLength && video.duration) {
      analytics.videoLength = Math.floor(video.duration);
    }
  }

  function trackPause() { pushSegment(); }

  function sendAnalytics() {
    if (analytics.sent || analytics.segments.length === 0) return;
    analytics.sent = true;
    pushSegment();
    var payload = JSON.stringify({
      videoId: analytics.videoId,
      segments: analytics.segments,
      videoLength: analytics.videoLength
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/track', payload);
    }
  }

  function setupListeners() {
    video.addEventListener('play', function() { trackPlay(); onPlay(); });
    video.addEventListener('playing', function() { emit('player:playing', {}); hidePoster(); });
    video.addEventListener('pause', function() { trackPause(); onPause(); });
    video.addEventListener('ended', function() { trackPause(); sendAnalytics(); onEnded(); });
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    window.addEventListener('beforeunload', sendAnalytics);
    hideLoader();
    onReady();
  }

  function startHls() {
    if (HlsCtor && HlsCtor.isSupported()) {
      var hls = new HlsCtor({
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
        startLevel: -1,
        autoStartLoad: true
      });
      hls.loadSource(playUrl);
      hls.attachMedia(video);
      hls.on(HlsCtor.Events.MANIFEST_PARSED, function() {
        setupListeners();
        video.play().catch(function() {});
      });
      hls.on(HlsCtor.Events.ERROR, function(_, data) {
        if (data.fatal) {
          switch (data.type) {
            case HlsCtor.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case HlsCtor.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = playUrl;
      video.addEventListener('loadedmetadata', function() {
        setupListeners();
        video.play().catch(function() {});
      });
    } else {
      showLoader();
      console.error('HLS não suportado neste navegador.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startHls);
  } else {
    startHls();
  }

  playBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    video.play().then(function() { hidePoster(); }).catch(function() {});
  });
  poster.addEventListener('click', function() {
    video.play().then(function() { hidePoster(); }).catch(function() {});
  });
})();
</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
}
