<script>
(function() {
    'use strict';
    
    // Configurações
    const CONFIG = {
        parameterName: 'vazarato',
        parameterValue: 'true',
        redirectUrl: 'https://seudominio.com',
        storageKeys: {
            userRedirected: 'userRedirected',
            userAccessed: 'userAccessed'
        }
    };

    /**
     * Obtém um parâmetro específico da URL
     * @param {string} name - Nome do parâmetro
     * @returns {string|null} - Valor do parâmetro ou null se não encontrado
     */
    function getURLParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    /**
     * Remove um parâmetro específico da URL
     * @param {string} url - URL completa
     * @param {string} parameter - Nome do parâmetro a ser removido
     * @returns {string} - URL limpa sem o parâmetro
     */
    function removeURLParameter(url, parameter) {
        try {
            const urlObj = new URL(url);
            urlObj.searchParams.delete(parameter);
            return urlObj.toString();
        } catch (error) {
            console.warn('Erro ao processar URL:', error);
            return url;
        }
    }

    /**
     * Verifica se o localStorage está disponível
     * @returns {boolean} - true se localStorage estiver disponível
     */
    function isLocalStorageAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Obtém valor do localStorage com fallback
     * @param {string} key - Chave do localStorage
     * @returns {string|null} - Valor armazenado ou null
     */
    function getStorageValue(key) {
        if (!isLocalStorageAvailable()) return null;
        try {
            return localStorage.getItem(key);
        } catch (error) {
            console.warn('Erro ao acessar localStorage:', error);
            return null;
        }
    }

    /**
     * Define valor no localStorage com tratamento de erro
     * @param {string} key - Chave do localStorage
     * @param {string} value - Valor a ser armazenado
     */
    function setStorageValue(key, value) {
        if (!isLocalStorageAvailable()) return;
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            console.warn('Erro ao definir localStorage:', error);
        }
    }

    /**
     * Realiza o redirecionamento do usuário
     */
    function redirectUser() {
        setStorageValue(CONFIG.storageKeys.userRedirected, 'true');
        window.location.href = CONFIG.redirectUrl;
    }

    /**
     * Remove o parâmetro da URL sem recarregar a página
     */
    function cleanURL() {
        const cleanedURL = removeURLParameter(window.location.href, CONFIG.parameterName);
        
        if (cleanedURL !== window.location.href) {
            try {
                history.replaceState(null, null, cleanedURL);
            } catch (error) {
                console.warn('Erro ao limpar URL:', error);
            }
        }
    }

    /**
     * Função principal que controla o fluxo de acesso
     */
    function handleAccess() {
        const userRedirected = getStorageValue(CONFIG.storageKeys.userRedirected);
        const userAccessed = getStorageValue(CONFIG.storageKeys.userAccessed);
        const urlParameter = getURLParameter(CONFIG.parameterName);

        // Verifica se o usuário já foi redirecionado anteriormente
        if (userRedirected === 'true') {
            redirectUser();
            return;
        }

        // Se o usuário já acessou corretamente antes, apenas limpa a URL
        if (userAccessed === 'true') {
            cleanURL();
            return;
        }

        // Verifica se a página foi acessada com o parâmetro correto
        if (urlParameter !== CONFIG.parameterValue) {
            redirectUser();
        } else {
            // Marca que o usuário acessou corretamente e limpa a URL
            setStorageValue(CONFIG.storageKeys.userAccessed, 'true');
            cleanURL();
        }
    }

    // Executa quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handleAccess);
    } else {
        handleAccess();
    }

})();
</script>