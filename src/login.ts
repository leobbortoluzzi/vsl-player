export function loginPage(): string {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VSL Player - Login</title>
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #c9d1d9; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 32px; width: 100%; max-width: 380px; }
  .card h1 { font-size: 22px; font-weight: 600; color: #f0f6fc; margin-bottom: 4px; }
  .card .subtitle { font-size: 13px; color: #8b949e; margin-bottom: 24px; }
  .field { margin-bottom: 16px; }
  .field label { display: block; font-size: 12px; color: #8b949e; margin-bottom: 4px; font-weight: 500; }
  .field input { width: 100%; padding: 8px 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #c9d1d9; font-size: 14px; outline: none; transition: border-color .2s; }
  .field input:focus { border-color: #1f6feb; }
  .btn { width: 100%; padding: 10px; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background .15s, opacity .15s; }
  .btn:disabled { opacity: .5; cursor: not-allowed; }
  .btn-primary { background: #238636; color: #fff; margin-top: 8px; }
  .btn-primary:hover:not(:disabled) { background: #2ea043; }
  .error { padding: 10px 14px; background: rgba(248,81,73,.15); color: #f85149; border: 1px solid rgba(248,81,73,.4); border-radius: 6px; font-size: 13px; margin-bottom: 16px; display: none; }
  .error.show { display: block; }
  .success { padding: 10px 14px; background: rgba(35,134,54,.15); color: #3fb950; border: 1px solid rgba(63,185,80,.4); border-radius: 6px; font-size: 13px; margin-bottom: 16px; display: none; }
  .success.show { display: block; }
  .separator { text-align: center; color: #484f58; font-size: 12px; margin: 16px 0; position: relative; }
  .separator::before, .separator::after { content: ''; position: absolute; top: 50%; width: 40%; height: 1px; background: #21262d; }
  .separator::before { left: 0; }
  .separator::after { right: 0; }
</style>
</head>
<body>
<div class="card">
  <h1>VSL Player</h1>
  <p class="subtitle" id="subtitle">Carregando...</p>
  <div class="error" id="error"></div>
  <div class="success" id="success"></div>

  <div id="setupForm" style="display:none">
    <div class="field">
      <label for="setupPassword">Defina sua senha (mín. 4 caracteres)</label>
      <input type="password" id="setupPassword" placeholder="Sua senha" autocomplete="new-password">
    </div>
    <div class="field">
      <label for="setupConfirm">Confirme a senha</label>
      <input type="password" id="setupConfirm" placeholder="Repita a senha" autocomplete="new-password">
    </div>
    <button class="btn btn-primary" id="setupBtn" disabled>Criar senha e entrar</button>
  </div>

  <div id="loginForm" style="display:none">
    <div class="field">
      <label for="loginPassword">Senha</label>
      <input type="password" id="loginPassword" placeholder="Digite sua senha" autocomplete="current-password">
    </div>
    <button class="btn btn-primary" id="loginBtn" disabled>Entrar</button>
  </div>
</div>

<script>
(function() {
  var subtitle = document.getElementById('subtitle');
  var error = document.getElementById('error');
  var success = document.getElementById('success');
  var setupForm = document.getElementById('setupForm');
  var loginForm = document.getElementById('loginForm');
  var setupPassword = document.getElementById('setupPassword');
  var setupConfirm = document.getElementById('setupConfirm');
  var setupBtn = document.getElementById('setupBtn');
  var loginPassword = document.getElementById('loginPassword');
  var loginBtn = document.getElementById('loginBtn');
  var isSetup = false;

  function hideAll() { setupForm.style.display = 'none'; loginForm.style.display = 'none'; error.classList.remove('show'); success.classList.remove('show'); }

  fetch('/api/auth/status')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      isSetup = !data.passwordSet;
      if (isSetup) {
        subtitle.textContent = 'Primeiro acesso — defina sua senha';
        setupForm.style.display = 'block';
      } else {
        subtitle.textContent = 'Faça login para continuar';
        loginForm.style.display = 'block';
      }
    })
    .catch(function() {
      hideAll();
      subtitle.textContent = 'Erro ao conectar. Recarregue a página.';
    });

  function updateSetupBtn() {
    setupBtn.disabled = !setupPassword.value || !setupConfirm.value || setupPassword.value.length < 4;
  }
  function updateLoginBtn() {
    loginBtn.disabled = !loginPassword.value;
  }

  setupPassword.addEventListener('input', updateSetupBtn);
  setupConfirm.addEventListener('input', updateSetupBtn);
  loginPassword.addEventListener('input', updateLoginBtn);

  setupBtn.addEventListener('click', function() {
    if (setupPassword.value !== setupConfirm.value) {
      error.textContent = 'As senhas não coincidem';
      error.classList.add('show');
      return;
    }
    setupBtn.disabled = true;
    fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: setupPassword.value })
    })
    .then(function(r) { return r.json().then(function(d) { return { status: r.status, body: d }; }); })
    .then(function(res) {
      if (res.status >= 200 && res.status < 300) {
        window.location.href = '/';
      } else {
        error.textContent = res.body.error || 'Erro ao criar senha';
        error.classList.add('show');
        setupBtn.disabled = false;
      }
    })
    .catch(function(err) {
      error.textContent = 'Erro de conexão';
      error.classList.add('show');
      setupBtn.disabled = false;
    });
  });

  loginBtn.addEventListener('click', function() {
    loginBtn.disabled = true;
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: loginPassword.value })
    })
    .then(function(r) { return r.json().then(function(d) { return { status: r.status, body: d }; }); })
    .then(function(res) {
      if (res.status >= 200 && res.status < 300) {
        window.location.href = '/';
      } else {
        error.textContent = res.body.error || 'Senha incorreta';
        error.classList.add('show');
        loginBtn.disabled = false;
      }
    })
    .catch(function() {
      error.textContent = 'Erro de conexão';
      error.classList.add('show');
      loginBtn.disabled = false;
    });
  });

  setupPassword.addEventListener('keydown', function(e) { if (e.key === 'Enter' && !setupBtn.disabled) setupBtn.click(); });
  setupConfirm.addEventListener('keydown', function(e) { if (e.key === 'Enter' && !setupBtn.disabled) setupBtn.click(); });
  loginPassword.addEventListener('keydown', function(e) { if (e.key === 'Enter' && !loginBtn.disabled) loginBtn.click(); });
})();
</script>
</body>
</html>`;
}
