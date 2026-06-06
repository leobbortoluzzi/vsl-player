export function adminPage(): string {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VSL Player - Admin</title>
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #c9d1d9; min-height: 100vh; }
  .header { background: #161b22; border-bottom: 1px solid #30363d; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; }
  .header h1 { font-size: 18px; font-weight: 600; color: #f0f6fc; display: flex; align-items: center; gap: 8px; }
  .header .badge { background: #1f6feb; color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 500; }
  .header .logout { background: #21262d; color: #c9d1d9; border: 1px solid #30363d; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; transition: background .15s; }
  .header .logout:hover { background: #30363d; }
  .container { max-width: 800px; margin: 0 auto; padding: 24px; }
  .loading-screen { display: flex; align-items: center; justify-content: center; min-height: 60vh; color: #8b949e; font-size: 14px; }

  .upload-section { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 24px; margin-bottom: 24px; }
  .upload-section h2 { font-size: 16px; font-weight: 600; color: #f0f6fc; margin-bottom: 16px; }
  .drop-zone { border: 2px dashed #30363d; border-radius: 8px; padding: 40px 24px; text-align: center; cursor: pointer; transition: border-color .2s, background .2s; }
  .drop-zone:hover, .drop-zone.dragover { border-color: #1f6feb; background: rgba(31,111,235,.06); }
  .drop-zone .icon { font-size: 36px; margin-bottom: 10px; }
  .drop-zone p { color: #8b949e; font-size: 14px; }
  .drop-zone p strong { color: #c9d1d9; }
  .drop-zone .file-name { color: #58a6ff; font-size: 14px; margin-top: 8px; font-weight: 500; display: none; }
  .drop-zone .file-name.visible { display: block; }

  .meta-row { display: flex; gap: 12px; margin-top: 16px; align-items: flex-end; }
  .field { flex: 1; }
  .field label { display: block; font-size: 12px; color: #8b949e; margin-bottom: 4px; font-weight: 500; }
  .field input { width: 100%; padding: 8px 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #c9d1d9; font-size: 14px; outline: none; transition: border-color .2s; }
  .field input:focus { border-color: #1f6feb; }

  .btn { padding: 8px 16px; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background .15s, opacity .15s; white-space: nowrap; }
  .btn:disabled { opacity: .5; cursor: not-allowed; }
  .btn-primary { background: #238636; color: #fff; }
  .btn-primary:hover:not(:disabled) { background: #2ea043; }
  .btn-danger { background: #da3633; color: #fff; }
  .btn-danger:hover:not(:disabled) { background: #f85149; }
  .btn-copy { background: #21262d; color: #c9d1d9; border: 1px solid #30363d; }
  .btn-copy:hover:not(:disabled) { background: #30363d; }

  .progress-wrap { margin-top: 16px; }
  .progress-bar-bg { height: 6px; background: #21262d; border-radius: 3px; overflow: hidden; display: none; }
  .progress-bar-bg.active { display: block; }
  .progress-bar { height: 100%; background: #1f6feb; border-radius: 3px; transition: width .15s; width: 0%; }
  .progress-text { font-size: 12px; color: #8b949e; margin-top: 6px; display: none; }
  .progress-text.active { display: block; }
  .progress-step { display: inline-flex; align-items: center; gap: 4px; }
  .progress-step.done { color: #3fb950; }
  .progress-step.current { color: #58a6ff; font-weight: 500; }

  .message { padding: 10px 14px; border-radius: 6px; font-size: 13px; margin-top: 12px; display: none; }
  .message.success { display: block; background: rgba(35,134,54,.15); color: #3fb950; border: 1px solid rgba(63,185,80,.4); }
  .message.error { display: block; background: rgba(248,81,73,.15); color: #f85149; border: 1px solid rgba(248,81,73,.4); }
  .message .embed-link { display: block; margin-top: 6px; word-break: break-all; color: #58a6ff; }
  .message .embed-block { margin-top: 8px; padding: 8px 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 4px; font-family: monospace; font-size: 12px; color: #c9d1d9; word-break: break-all; cursor: pointer; transition: border-color .15s; }
  .message .embed-block:hover { border-color: #58a6ff; }
  .message .embed-label { font-size: 11px; color: #8b949e; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .5px; }


  .videos-section { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 24px; }
  .videos-section h2 { font-size: 16px; font-weight: 600; color: #f0f6fc; margin-bottom: 16px; }
  .empty-state { text-align: center; padding: 32px; color: #484f58; font-size: 14px; }
  .video-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #21262d; }
  .video-row:last-child { border-bottom: none; }
  .video-row .info { flex: 1; min-width: 0; }
  .video-row .title { font-weight: 500; color: #f0f6fc; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .video-row .meta { font-size: 12px; color: #8b949e; margin-top: 2px; }
  .video-row .status-badge { font-size: 11px; padding: 1px 6px; border-radius: 8px; font-weight: 500; }
  .video-row .status-badge.ready { background: rgba(35,134,54,.15); color: #3fb950; }
  .video-row .status-badge.processing { background: rgba(210,153,34,.15); color: #d29922; }
  .video-row .actions { display: flex; gap: 6px; flex-shrink: 0; }

  .toast { position: fixed; bottom: 24px; right: 24px; background: #238636; color: #fff; padding: 10px 18px; border-radius: 6px; font-size: 13px; font-weight: 500; opacity: 0; transform: translateY(10px); transition: opacity .25s, transform .25s; pointer-events: none; z-index: 100; }
  .toast.show { opacity: 1; transform: translateY(0); }

  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 200; display: none; align-items: center; justify-content: center; }
  .modal-overlay.active { display: flex; }
  .modal { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 24px; width: 90%; max-width: 640px; max-height: 80vh; overflow-y: auto; }
  .modal h2 { font-size: 16px; color: #f0f6fc; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
  .modal-close { background: none; border: none; color: #8b949e; cursor: pointer; font-size: 18px; padding: 4px 8px; border-radius: 4px; }
  .modal-close:hover { color: #f0f6fc; background: #21262d; }
  .analytics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
  .analytics-card { background: #0d1117; border: 1px solid #21262d; border-radius: 6px; padding: 14px; text-align: center; }
  .analytics-card .val { font-size: 24px; font-weight: 700; color: #58a6ff; }
  .analytics-card .lbl { font-size: 11px; color: #8b949e; margin-top: 4px; text-transform: uppercase; letter-spacing: .5px; }
  .heatmap-wrap { margin-top: 16px; }
  .heatmap-wrap h3 { font-size: 13px; color: #f0f6fc; margin-bottom: 8px; }
  .heatmap-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
  .heatmap-label { font-size: 10px; color: #8b949e; width: 48px; text-align: right; flex-shrink: 0; }
  .heatmap-bar-bg { flex: 1; height: 14px; background: #21262d; border-radius: 3px; overflow: hidden; }
  .heatmap-bar { height: 100%; background: #1f6feb; border-radius: 3px; min-width: 2px; }
  .analytics-empty { text-align: center; color: #484f58; padding: 24px; }
</style>
</head>
<body>
<div class="header">
  <h1>VSL Player <span class="badge">Admin</span></h1>
  <button class="logout" id="logoutBtn">Sair</button>
</div>

<div class="container">
  <div class="upload-section">
    <h2>Upload de Vídeo</h2>
    <div class="drop-zone" id="dropZone">
      <div class="icon">📁</div>
      <p>Arraste um arquivo <strong>.mp4</strong> aqui ou clique para selecionar</p>
      <p class="file-name" id="fileName"></p>
      <input type="file" id="fileInput" accept="video/mp4" style="display:none">
    </div>
    <div class="meta-row">
      <div class="field">
        <label for="titleInput">Título do vídeo</label>
        <input type="text" id="titleInput" placeholder="Nome do vídeo">
      </div>
      <button class="btn btn-primary" id="uploadBtn" disabled>Enviar</button>
    </div>
    <div class="progress-wrap">
      <div class="progress-bar-bg" id="progressBg"><div class="progress-bar" id="progressBar"></div></div>
      <div class="progress-text" id="progressText"></div>
    </div>
    <div class="message" id="message"></div>
  </div>

  <div class="videos-section">
    <h2>Meus Vídeos</h2>
    <div id="videoList"></div>
  </div>
</div>

<div class="toast" id="toast">Link copiado!</div>

<div class="modal-overlay" id="analyticsModalOverlay">
  <div class="modal" id="analyticsModal"></div>
</div>

<script>
(function() {
  var dropZone = document.getElementById('dropZone');
  var fileInput = document.getElementById('fileInput');
  var fileNameEl = document.getElementById('fileName');
  var titleInput = document.getElementById('titleInput');
  var uploadBtn = document.getElementById('uploadBtn');
  var progressBg = document.getElementById('progressBg');
  var progressBar = document.getElementById('progressBar');
  var progressText = document.getElementById('progressText');
  var message = document.getElementById('message');
  var videoList = document.getElementById('videoList');
  var toast = document.getElementById('toast');
  var logoutBtn = document.getElementById('logoutBtn');
  var selectedFile = null;

  // --- Login check ---
  function checkAuth() {
    fetch('/api/auth/me')
      .then(function(r) {
        if (r.status !== 200) { window.location.href = '/login'; return; }
        document.querySelector('.loading-screen') && document.querySelector('.loading-screen').remove();
        initAdmin();
      })
      .catch(function() { window.location.href = '/login'; });
  }

  logoutBtn.addEventListener('click', function() {
    fetch('/api/auth/logout', { method: 'POST' })
      .then(function() { window.location.href = '/login'; })
      .catch(function() { window.location.href = '/login'; });
  });

  // --- Init ---
  function initAdmin() {
    dropZone.addEventListener('click', function() { fileInput.click(); });
    dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      var files = e.dataTransfer.files;
      if (files.length > 0) handleFile(files[0]);
    });
    fileInput.addEventListener('change', function() {
      if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
    });
    titleInput.addEventListener('input', updateUploadBtn);
    uploadBtn.addEventListener('click', handleUpload);

    loadVideos();
  }

  function handleFile(file) {
    selectedFile = file;
    fileNameEl.textContent = file.name;
    fileNameEl.classList.add('visible');
    if (!titleInput.value) titleInput.value = file.name.replace(/\\.[^/.]+$/, '');
    updateUploadBtn();
  }

  function updateUploadBtn() {
    uploadBtn.disabled = !selectedFile || !titleInput.value.trim();
  }

  function showMessage(type, html) {
    message.className = 'message ' + type;
    message.innerHTML = html;
  }

  function resetUploadUI() {
    selectedFile = null;
    fileNameEl.classList.remove('visible');
    fileInput.value = '';
    titleInput.value = '';
    updateUploadBtn();
    setTimeout(function() {
      progressBg.classList.remove('active');
      progressText.classList.remove('active');
    }, 3000);
  }

  // --- Upload flow: create on Bunny -> PUT direct -> confirm on Worker ---
  function handleUpload() {
    if (!selectedFile || !titleInput.value.trim()) return;
    var title = titleInput.value.trim();

    uploadBtn.disabled = true;
    progressBg.classList.add('active');
    progressBar.style.width = '0%';
    progressText.classList.add('active');
    progressText.textContent = 'Criando no Bunny...';
    message.className = 'message';

    // Step 1: Create video entry on Bunny via Worker
    fetch('/api/videos/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title })
    })
    .then(function(r) {
      if (!r.ok) return r.json().then(function(d) { throw new Error(d.error || 'Erro ao criar vídeo no Bunny'); });
      return r.json();
    })
    .then(function(createData) {
      progressText.textContent = 'Enviando para o Bunny (0%)...';

      // Step 2: Upload file directly to Bunny
      return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('PUT', 'https://video.bunnycdn.com/library/' + createData.libraryId + '/videos/' + createData.bunnyGuid);

        xhr.setRequestHeader('AccessKey', createData.accessKey);

        xhr.upload.addEventListener('progress', function(e) {
          if (e.lengthComputable) {
            var pct = Math.round((e.loaded / e.total) * 100);
            progressBar.style.width = pct + '%';
            progressText.textContent = 'Enviando para o Bunny (' + pct + '%)...';
          }
        });

        xhr.addEventListener('load', function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(createData);
          } else {
            reject(new Error('Bunny upload failed: ' + xhr.status + ' ' + xhr.responseText));
          }
        });

        xhr.addEventListener('error', function() {
          reject(new Error('Erro de conexão no upload para o Bunny'));
        });

        xhr.send(selectedFile);
      });
    })
    .then(function(createData) {
      progressBar.style.width = '100%';
      progressText.textContent = 'Confirmando...';

      // Step 3: Confirm on Worker -> save to KV
      return fetch('/api/videos/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: createData.videoId, bunnyGuid: createData.bunnyGuid })
      }).then(function(r) {
        if (!r.ok) return r.json().then(function(d) { throw new Error(d.error || 'Erro ao confirmar'); });
        return r.json();
      });
    })
    .then(function(confirmData) {
      var embedUrl = location.origin + '/embed/' + confirmData.id;
      var scriptTag = '<script src="' + embedUrl + '.js" async><\\/script>';
      showMessage('success',
        '<div class="embed-label">Script (recomendado)</div>' +
        '<div class="embed-block" onclick="copyText(\\'' + escAttr(scriptTag) + '\\')">' + escHtml(scriptTag) + '</div>' +
        '<div class="embed-label" style="margin-top:8px">Iframe</div>' +
        '<div class="embed-block" onclick="copyText(\\'' + escAttr(embedUrl) + '\\')">' + escHtml(embedUrl) + '</div>'
      );
      progressText.textContent = 'Concluído!';
      resetUploadUI();
      loadVideos();
    })
    .catch(function(err) {
      showMessage('error', err.message);
      progressText.textContent = 'Falha no upload';
      uploadBtn.disabled = !selectedFile || !titleInput.value.trim();
    });
  }

  // --- Video list ---
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
      toast.classList.add('show');
      setTimeout(function() { toast.classList.remove('show'); }, 2000);
    });
  }

  function deleteVideo(id) {
    if (!confirm('Tem certeza que deseja remover este vídeo?')) return;
    fetch('/api/videos/' + id, { method: 'DELETE' })
      .then(function(r) { return r.json(); })
      .then(function() { loadVideos(); })
      .catch(function(err) { alert('Erro: ' + err.message); });
  }

  function loadVideos() {
    fetch('/api/videos')
      .then(function(r) {
        if (r.status === 401) { window.location.href = '/login'; return; }
        return r.json();
      })
      .then(function(videos) {
        if (!videos || !videos.length) {
          videoList.innerHTML = '<div class="empty-state">Nenhum vídeo enviado ainda.</div>';
          return;
        }
        videoList.innerHTML = videos.map(function(v) {
          var embedUrl = location.origin + '/embed/' + v.id;
          var scriptTag = '<script src="' + embedUrl + '.js" async><\\/script>';
          var isReady = v.status >= 4;
          var statusLabel = isReady ? 'Pronto' : 'Processando';
          var statusClass = isReady ? 'ready' : 'processing';
          var duration = v.length ? formatTime(v.length) : '--';
          var date = v.createdAt ? new Date(v.createdAt).toLocaleDateString('pt-BR') : '--';
          return '<div class="video-row">' +
            '<div class="info">' +
              '<div class="title">' + escHtml(v.title || 'Sem título') + '</div>' +
              '<div class="meta">' + date + ' · ' + duration + ' · <span class="status-badge ' + statusClass + '">' + statusLabel + '</span></div>' +
            '</div>' +
            '<div class="actions">' +
              '<button class="btn btn-copy" onclick="copyText(\\'' + escAttr(scriptTag) + '\\')">Script</button>' +
              '<button class="btn btn-copy" onclick="copyText(\\'' + escAttr(embedUrl) + '\\')">Iframe</button>' +
              '<button class="btn btn-copy" onclick="showAnalytics(\\'' + v.id + '\\')">Analytics</button>' +
              '<button class="btn btn-danger" onclick="delVideo(\\'' + v.id + '\\')">Remover</button>' +
            '</div>' +
          '</div>';
        }).join('');
      })
      .catch(function() {
        videoList.innerHTML = '<div class="empty-state">Erro ao carregar vídeos.</div>';
      });
  }

  window.copyText = copyToClipboard;
  window.delVideo = deleteVideo;

  // --- Analytics ---
  var analyticsModal = document.getElementById('analyticsModal');
  var analyticsOverlay = document.getElementById('analyticsModalOverlay');

  analyticsOverlay.addEventListener('click', function(e) {
    if (e.target === analyticsOverlay) closeAnalytics();
  });

  window.showAnalytics = function(videoId) {
    analyticsModal.innerHTML = '<div style="text-align:center;color:#8b949e;padding:24px;">Carregando...</div>';
    analyticsOverlay.classList.add('active');

    fetch('/api/analytics/' + videoId)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data.totalSessions) {
          analyticsModal.innerHTML =
            '<h2>Analytics <button class="modal-close" onclick="closeAnalytics()">&#10005;</button></h2>' +
            '<div class="analytics-empty">Nenhuma visualização ainda.</div>';
          return;
        }

        var avgWatch = Math.round(data.totalWatchSeconds / data.totalSessions);
        var avgRetention = data.totalDurationAvailable > 0
          ? Math.round((data.totalWatchSeconds / data.totalDurationAvailable) * 100)
          : 0;

        var keys = Object.keys(data.heatmap).map(Number).sort(function(a, b) { return a - b; });

        var heatmapHtml = '';
        var maxVal = 1;
        for (var i = 0; i < keys.length; i++) {
          if (data.heatmap[keys[i]] > maxVal) maxVal = data.heatmap[keys[i]];
        }

        for (var i = 0; i < Math.min(keys.length, 24); i++) {
          var bucket = keys[i];
          var sec = bucket * 5;
          var min = Math.floor(sec / 60);
          var s = sec % 60;
          var label = min + ':' + (s < 10 ? '0' + s : s);
          var pct = Math.round((data.heatmap[bucket] / maxVal) * 100);
          heatmapHtml +=
            '<div class="heatmap-bar-row">' +
              '<div class="heatmap-label">' + label + '</div>' +
              '<div class="heatmap-bar-bg"><div class="heatmap-bar" style="width:' + pct + '%"></div></div>' +
            '</div>';
        }

        analyticsModal.innerHTML =
          '<h2>Analytics <button class="modal-close" onclick="closeAnalytics()">&#10005;</button></h2>' +
          '<div class="analytics-grid">' +
            '<div class="analytics-card"><div class="val">' + data.totalSessions + '</div><div class="lbl">Views</div></div>' +
            '<div class="analytics-card"><div class="val">' + formatTime(avgWatch) + '</div><div class="lbl">Média assistida</div></div>' +
            '<div class="analytics-card"><div class="val">' + avgRetention + '%</div><div class="lbl">Retenção</div></div>' +
          '</div>' +
          (heatmapHtml ? '<div class="heatmap-wrap"><h3>Retenção por trecho (5s)</h3>' + heatmapHtml + '</div>' : '');
      })
      .catch(function() {
        analyticsModal.innerHTML =
          '<h2>Analytics <button class="modal-close" onclick="closeAnalytics()">&#10005;</button></h2>' +
          '<div class="analytics-empty">Erro ao carregar analytics.</div>';
      });
  };

  window.closeAnalytics = function() {
    analyticsOverlay.classList.remove('active');
  };

  // Start
  checkAuth();
})();

function formatTime(s) { var m = Math.floor(s/60); var sec = Math.floor(s%60); return m + ':' + (sec<10?'0'+sec:sec); }
function escHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escAttr(s) { return (s||'').replace(/\\\\/g,'\\\\\\\\').replace(/'/g,'\\\\\\''); }
</script>
</body>
</html>`;
}
