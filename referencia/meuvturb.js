/* === CONFIGURAÇÕES GERAIS === */
const videoSrc = "https://vz-af4cf92c-ffc.b-cdn.net/e28bc8cf-2c48-46cc-a583-48a6c30c208c/playlist.m3u8";
const videoId = "meu-video-hls";

// SUBSTITUA PELOS IDs DAS SUAS VARIÁVEIS DO WEWEB
const wwVarId_IsPlaying = "18ad9330-741f-4132-9561-2eb2eaaedc63";
const wwVarId_CurrentTime = "ca90f0bf-f760-43db-babd-305645c0e05e";
// Nota: A variável de Muted controlaremos mais pela interface, mas o estado inicial é importante.

const video = document.getElementById(videoId);
const HlsConstructor = window.Hls || Hls;

if (!video) { console.error("Elemento de vídeo não encontrado!"); return; }

/* === FUNÇÃO PARA ATUALIZAR WEWEB === */
// Atualiza as variáveis do WeWeb conforme o vídeo roda
function setupWeWebListeners() {
    // Sincronizar Tempo (Current Time)
    video.addEventListener('timeupdate', () => {
        // wwLib é a biblioteca global do WeWeb
        wwLib.wwVariable.updateValue(wwVarId_CurrentTime, video.currentTime);
    });

    // Sincronizar Play/Pause
    video.addEventListener('play', () => {
        wwLib.wwVariable.updateValue(wwVarId_IsPlaying, true);
    });

    video.addEventListener('pause', () => {
        wwLib.wwVariable.updateValue(wwVarId_IsPlaying, false);
    });

    video.addEventListener('ended', () => {
        wwLib.wwVariable.updateValue(wwVarId_IsPlaying, false);
    });

    video.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
}

/* === INICIALIZAÇÃO HLS === */
if (HlsConstructor.isSupported()) {
    // Configuração OTIMIZADA para não baixar tudo de uma vez
    const hls = new HlsConstructor({
        maxBufferLength: 10,     // Mantém apenas 10s de buffer à frente (evita baixar o video todo)
        maxMaxBufferLength: 20,  // Máximo absoluto de buffer
        startLevel: -1,          // Auto-detectar qualidade inicial baseada na internet
        autoStartLoad: true
    });

    hls.loadSource(videoSrc);
    hls.attachMedia(video);

    hls.on(HlsConstructor.Events.MANIFEST_PARSED, function () {
        // Tenta iniciar mudo (necessário para navegadores modernos permitirem autoplay)
        video.muted = true;
        video.play().catch(e => console.log("Autoplay bloqueado pelo browser, aguardando clique."));
        setupWeWebListeners();
    });
}
// Fallback para iOS (Safari)
else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = videoSrc;
    video.muted = true; // Necessário para autoplay no iPhone
    video.addEventListener('loadedmetadata', function () {
        video.play();
        setupWeWebListeners();
    });
} else {
    console.error("HLS não suportado.");
}