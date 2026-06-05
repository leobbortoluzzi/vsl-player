// --- CONFIGURAÇÕES ---
const weWebVarStatusId = '7baead2e-963c-4dfb-b832-1ab799a8f979'; // Variável de Play/Pause (Boolean)
const weWebVarTempoId = '70f7ccc7-9243-49eb-9747-b580d3ea76b8';    // Variável de Tempo (Number)

// Função auxiliar para atualizar WeWeb
function updateWeWeb(varId, valor) {
    if (window.wwLib && wwLib.wwVariable) {
        wwLib.wwVariable.updateValue(varId, valor);
    }
}

// Armadilha VTurb (Singleton para evitar duplicidade)
if (!window.vturbTrackerActive) {
    console.log("⏱️ Rastreador VTurb (Status + Segundos) Iniciado...");

    document.addEventListener("player:ready", function (e) {
        // Pega o player que gritou "estou pronto"
        const player = e.detail && e.detail.player;

        if (player) {
            console.log("✅ Player capturado para extração de tempo!", player);

            // --- 1. STATUS (PLAY/PAUSE) ---
            const setPlay = (state) => updateWeWeb(weWebVarStatusId, state);

            player.addEventListener("video:play", () => setPlay(true));
            player.addEventListener("video:playing", () => setPlay(true));
            player.addEventListener("video:pause", () => setPlay(false));
            player.addEventListener("video:ended", () => setPlay(false));

            // Checagem inicial
            if (player.video && !player.video.paused) setPlay(true);


            // --- 2. TEMPO (SEGUNDOS) ---
            player.addEventListener("video:timeupdate", function (evento) {
                if (evento.detail && typeof evento.detail.time === 'number') {

                    // Pegamos o tempo puro (ex: 10.5432)
                    let segundosReais = evento.detail.time;

                    // DICA DE PERFORMANCE:
                    // Arredondamos para INTEIRO (ex: 10) usando Math.floor.
                    // Isso evita que o WeWeb trave tentando atualizar a variável 60 vezes por segundo com números quebrados (10.1, 10.2...)
                    // Se você precisar de precisão milimétrica, remova o 'Math.floor'.
                    let segundosInteiros = Math.floor(segundosReais);

                    // Só atualiza o WeWeb se o segundo mudou (ex: mudou de 10 para 11)
                    if (window.ultimoSegundo !== segundosInteiros) {
                        updateWeWeb(weWebVarTempoId, segundosInteiros);
                        window.ultimoSegundo = segundosInteiros;

                        // Console opcional para você ver funcionando (pode apagar depois)
                        // console.log("Tempo:", segundosInteiros); 
                    }
                }
            });
        }
    });

    window.vturbTrackerActive = true;
}

return "Rastreador de Segundos Ativo";