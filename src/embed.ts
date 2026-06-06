import { getPlayUrl, getThumbnailUrl } from './bunny';

export interface EmbedData {
  title: string;
  videoId: string;
  libraryId: string;
  bunnyGuid: string;
}

export function embedScript(data: EmbedData): string {
  const { title, videoId, libraryId, bunnyGuid } = data;
  const playUrl = getPlayUrl(libraryId, bunnyGuid);
  const thumbnailUrl = getThumbnailUrl(libraryId, bunnyGuid);

  return `(function() {
  var VSL = {
    videoId: ${JSON.stringify(videoId)},
    title: ${JSON.stringify(title)},
    playUrl: ${JSON.stringify(playUrl)},
    thumbnailUrl: ${JSON.stringify(thumbnailUrl)},
    bufferLength: 10,
    autoplay: true,
    getScriptTag: function() {
      return document.currentScript || document.querySelector('script[data-vsl-loaded]');
    }
  };

  var script = VSL.getScriptTag();
  if (!script) return;
  script.setAttribute('data-vsl-loaded', '1');

  var wrapper = document.createElement('div');
  wrapper.className = 'vsl-player';
  wrapper.style.cssText = 'position:relative;width:100%;max-width:100%;aspect-ratio:16/9;background:#000;overflow:hidden;line-height:0;';

  var video = document.createElement('video');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.muted = true;
  video.style.cssText = 'width:100%;height:100%;object-fit:contain;outline:none;';
  video.addEventListener('contextmenu', function(e) { e.preventDefault(); });

  var poster = document.createElement('div');
  poster.className = 'vsl-poster';
  poster.style.cssText = 'position:absolute;inset:0;background-size:contain;background-repeat:no-repeat;background-position:center;background-color:#000;cursor:pointer;transition:opacity .3s;z-index:2;';
  if (VSL.thumbnailUrl) {
    poster.style.backgroundImage = 'url(' + VSL.thumbnailUrl + ')';
  }

  var playBtn = document.createElement('div');
  playBtn.className = 'vsl-play-btn';
  playBtn.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:80px;height:80px;background:rgba(0,0,0,.6);border:3px solid #fff;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .15s,background .15s;z-index:3;';
  playBtn.innerHTML = '<div style="width:0;height:0;border-left:28px solid #fff;border-top:18px solid transparent;border-bottom:18px solid transparent;margin-left:6px;"></div>';

  var loader = document.createElement('div');
  loader.className = 'vsl-loader';
  loader.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:48px;height:48px;border:4px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;animation:vsl-spin .8s linear infinite;display:none;z-index:4;';

  var styleEl = document.createElement('style');
  styleEl.textContent = '@keyframes vsl-spin{to{transform:translate(-50%,-50%) rotate(360deg);}}.vsl-loader.active{display:block;}.vsl-poster.hidden{opacity:0;pointer-events:none;}.vsl-play-btn:hover{transform:translate(-50%,-50%) scale(1.08);background:rgba(0,0,0,.8);}';

  document.head.appendChild(styleEl);
  poster.appendChild(playBtn);
  wrapper.appendChild(poster);
  wrapper.appendChild(video);
  wrapper.appendChild(loader);

  if (script.parentNode) {
    script.parentNode.insertBefore(wrapper, script.nextSibling);
  }

  function emit(name, detail) {
    var event = new CustomEvent(name, { detail: detail });
    document.dispatchEvent(event);
  }

  function hidePoster() { poster.classList.add('hidden'); }
  function hideLoader() { loader.classList.remove('active'); }

  // ── Analytics tracking ──────────────────────
  var analytics = { segmentStart: -1, segments: [], videoLength: 0, videoId: VSL.videoId, sent: false };

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

  video.addEventListener('play', function() { trackPlay(); emit('player:play', {}); hidePoster(); });
  video.addEventListener('playing', function() { emit('player:playing', {}); hidePoster(); });
  video.addEventListener('pause', function() { trackPause(); emit('player:pause', {}); });
  video.addEventListener('ended', function() { trackPause(); sendAnalytics(); emit('player:ended', {}); });
  video.addEventListener('timeupdate', function() { emit('player:timeupdate', { time: video.currentTime }); });
  window.addEventListener('beforeunload', sendAnalytics);
  // ────────────────────────────────────────────

  playBtn.addEventListener('click', function(e) { e.stopPropagation(); video.play().catch(function(){}); });
  poster.addEventListener('click', function() { video.play().catch(function(){}); });

  function loadHls(cb) {
    if (window.Hls) return cb(window.Hls);
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
    s.onload = function() { cb(window.Hls); };
    s.onerror = function() { cb(null); };
    document.head.appendChild(s);
  }

  loadHls(function(HlsCtor) {
    if (HlsCtor && HlsCtor.isSupported()) {
      var hls = new HlsCtor({
        maxBufferLength: VSL.bufferLength,
        maxMaxBufferLength: VSL.bufferLength * 2,
        startLevel: -1,
        autoStartLoad: true
      });
      hls.loadSource(VSL.playUrl);
      hls.attachMedia(video);
      hls.on(HlsCtor.Events.MANIFEST_PARSED, function() {
        video.muted = true;
        hideLoader();
        emit('player:ready', {});
        if (VSL.autoplay) video.play().catch(function(){});
      });
      hls.on(HlsCtor.Events.ERROR, function(_, data) {
        if (data.fatal) {
          switch (data.type) {
            case HlsCtor.ErrorTypes.NETWORK_ERROR: hls.startLoad(); break;
            case HlsCtor.ErrorTypes.MEDIA_ERROR: hls.recoverMediaError(); break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = VSL.playUrl;
      video.muted = true;
      video.addEventListener('loadedmetadata', function() {
        hideLoader();
        emit('player:ready', {});
        if (VSL.autoplay) video.play().catch(function(){});
      });
    } else {
      loader.classList.add('active');
      console.error('HLS não suportado.');
    }
  });

})();`;
}
