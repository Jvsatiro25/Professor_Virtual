/* =========================================================
   CONFIGURAÇÃO DOS WEBHOOKS E CONSTANTES
========================================================= */

const REGISTER_WEBHOOK = "https://hook.us2.make.com/xdovbkootc5fmjbghetlg8itehqne3ij";
const LOGIN_WEBHOOK    = "https://hook.us2.make.com/re7tbke247yk6hoeuu8lou2tlrd0c3mh";
const CHAT_WEBHOOK     = "https://hook.us2.make.com/5cjoe1hxb4862q3uatlk9gjmv5tvqe39";

/* =========================================================
   VERIFICAÇÃO DE SESSÃO AUTOMÁTICA
========================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('pv_user');
    
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            openChat();
        } catch (e) {
            logout();
        }
    } else {
        showAuthScreen();
    }
});

function showAuthScreen() {
    document.getElementById("chatScreen").classList.remove("active");
    document.getElementById("waitScreen").classList.remove("active");
    document.getElementById("authScreen").classList.add("active");
    document.getElementById("loginForm").style.display = "block";
}


/* =========================================================
   GERENCIAMENTO DE MENSAGENS E TEMPO
========================================================= */

function getStoredMessages(tabName) {
    if (!currentUser) return [];
    let key = `pv_msgs_${currentUser.id}_${tabName}`;
    let msgs = localStorage.getItem(key);
    if (!msgs) {
        let defaultMsg = `Bem-vindo ao chat. Como posso te ajudar hoje?`;
        if (tabName === 'psicanalise') defaultMsg = `Boas vindas ao acompanhamento do Curso de Psicanálise. 🧠`;
        if (tabName === 'biblia') defaultMsg = `Bem-vindo ao chat de Estudos Bíblicos e Teológicos. 📖`;
        if (tabName === 'florais') defaultMsg = `Bem-vindo ao chat exclusivo do Curso de Florais. 🌸`;
        if (tabName === 'livroExtra') defaultMsg = `Chat dedicado ao livro extra de estudos avançados. 📘`;
        
        const initial = [{ text: defaultMsg, type: 'ai', time: getFormattedTime() }];
        localStorage.setItem(key, JSON.stringify(initial));
        return initial;
    }
    return JSON.parse(msgs);
}

function saveStoredMessage(tabName, text, type) {
    if (!currentUser) return;
    let key = `pv_msgs_${currentUser.id}_${tabName}`;
    let msgs = getStoredMessages(tabName);
    msgs.push({ text, type, time: getFormattedTime() });
    localStorage.setItem(key, JSON.stringify(msgs));
}

function getFormattedTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}


/* =========================================================
   ESTADO DA SESSÃO
========================================================= */
let currentUser = null;
let tempCredentials = null;
let currentTab = "";


/* =========================================================
   CONTROLE DA SIDEBAR
========================================================= */
function toggleSidebar() {
    const sidebar = document.getElementById("appSidebar");
    const overlay = document.getElementById("sidebarOverlay");
    sidebar.classList.toggle("open");
    overlay.classList.toggle("active");
}


/* =========================================================
   TELA DE AUTENTICAÇÃO
========================================================= */
function showRegister() {
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("registerForm").style.display = "block";
    clearMessages();
}

function showLogin() {
    document.getElementById("registerForm").style.display = "none";
    document.getElementById("waitScreen").classList.remove("active");
    document.getElementById("authScreen").classList.add("active");
    document.getElementById("loginForm").style.display = "block";
    clearMessages();
}

function showWaitScreen() {
    document.getElementById("authScreen").classList.remove("active");
    document.getElementById("waitScreen").classList.add("active");
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = "block";
    }
}

function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) element.style.display = "none";
}

function clearMessages() {
    hideElement("loginError");
    hideElement("registerError");
    hideElement("waitError");
}


/* =========================================================
   TRATAMENTO DE PERMISSÃO (SIM E NÃO)
========================================================= */
function parsePermission(val) {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val === 1;
    if (typeof val === 'string') {
        const clean = val.trim().toUpperCase();
        return clean === 'SIM' || clean === 'S' || clean === 'TRUE' || clean === '1';
    }
    return false;
}


/* =========================================================
   CADASTRO E LOGIN COM COMUNICAÇÃO AO MAKE
========================================================= */
async function register() {
    clearMessages();
    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    if (!name || !email || !password) {
        showError("registerError", "Preencha todos os campos.");
        return;
    }

    const button = document.getElementById("registerButton");
    button.disabled = true;
    button.textContent = "Criando conta...";

    try {
        const response = await fetch(REGISTER_WEBHOOK, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome: name, email: email, senha: password })
        });

        if (!response.ok) throw new Error("Erro no servidor do Make.");

        tempCredentials = { email: email, senha: password };
        showWaitScreen();

    } catch (error) {
        showError("registerError", "Erro ao conectar com o servidor. Verifique sua conexão.");
    } finally {
        button.disabled = false;
        button.textContent = "Criar conta";
    }
}

async function login() {
    clearMessages();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
        showError("loginError", "Digite seu e-mail e sua senha.");
        return;
    }

    tempCredentials = { email: email, senha: password };
    executeLoginRequest(email, password, "loginError");
}

async function checkApproval() {
    hideElement("waitError");
    if (!tempCredentials) { showLogin(); return; }
    executeLoginRequest(tempCredentials.email, tempCredentials.senha, "waitError");
}

async function executeLoginRequest(email, password, errorElementId) {
    const button = errorElementId === "loginError" 
        ? document.getElementById("loginButton") 
        : document.getElementById("checkButton");

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Verificando...";

    try {
        const response = await fetch(LOGIN_WEBHOOK, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, senha: password })
        });

        if (!response.ok) throw new Error("Erro no servidor.");
        const data = await response.json();

        if (!data.sucesso) {
            showError(errorElementId, data.mensagem || "Acesso pendente ou dados incorretos.");
            if (data.status && data.status.toString().toLowerCase() === "pendente") showWaitScreen();
            return;
        }

        currentUser = {
            id: data.usuario.id || "1",
            nome: data.usuario.nome,
            email: data.usuario.email,
            permissoes: {
                psicanalise: parsePermission(data.usuario.psicanalise),
                biblia: parsePermission(data.usuario.biblia),
                florais: parsePermission(data.usuario.florais),
                livroExtra: parsePermission(data.usuario.livroExtra)
            }
        };

        localStorage.setItem('pv_user', JSON.stringify(currentUser));
        openChat();

    } catch (error) {
        showError(errorElementId, "Não foi possível conectar ao servidor.");
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}


/* =========================================================
   ABRIR CHAT & VISIBILIDADE DAS ABAS
========================================================= */
function openChat() {
    if (!currentUser) return;

    document.getElementById("authScreen").classList.remove("active");
    document.getElementById("waitScreen").classList.remove("active");
    document.getElementById("chatScreen").classList.add("active");

    document.getElementById("chatUserName").textContent = currentUser.nome;
    
    const nameParts = currentUser.nome.trim().split(" ");
    const initials = nameParts.length > 1 
        ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
        : nameParts[0].slice(0, 2).toUpperCase();
    document.getElementById("userAvatar").textContent = initials;

    const p = currentUser.permissoes || {};
    document.getElementById("btn-tab-psicanalise").style.display = p.psicanalise ? "flex" : "none";
    document.getElementById("btn-tab-biblia").style.display = p.biblia ? "flex" : "none";
    document.getElementById("btn-tab-florais").style.display = p.florais ? "flex" : "none";
    document.getElementById("btn-tab-livroExtra").style.display = p.livroExtra ? "flex" : "none";

    let firstTab = p.psicanalise ? 'psicanalise' : 
                   p.biblia ? 'biblia' : 
                   p.florais ? 'florais' : 
                   p.livroExtra ? 'livroExtra' : null;
    
    if (firstTab) {
        switchTab(firstTab);
    } else {
        alert("Sua conta não possui permissão para acessar nenhuma aba no momento.");
    }
}

function switchTab(tabName) {
    if (!tabName) return;
    currentTab = tabName;

    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".chat-view").forEach(v => v.classList.remove("active"));

    const targetBtn = document.getElementById(`btn-tab-${tabName}`);
    if (targetBtn) targetBtn.classList.add("active");

    const targetView = document.getElementById(`view-${tabName}`);
    if (targetView) targetView.classList.add("active");

    loadMessagesToUI(tabName);
    
    const sidebar = document.getElementById("appSidebar");
    if (sidebar.classList.contains("open")) toggleSidebar();
}

function logout() {
    currentUser = null; 
    tempCredentials = null;
    localStorage.removeItem('pv_user');
    showAuthScreen();
    document.getElementById("loginPassword").value = "";
}


/* =========================================================
   MENSAGENS DO CHAT
========================================================= */
function loadMessagesToUI(tabName) {
    const messagesContainer = document.getElementById(`messages-${tabName}`);
    messagesContainer.innerHTML = "";
    getStoredMessages(tabName).forEach(m => appendMessageElement(tabName, m.text, m.type, m.time));
    scrollToBottom(tabName);
}

function appendMessageElement(tabName, text, type, time) {
    const messages = document.getElementById(`messages-${tabName}`);
    const message = document.createElement("div");
    message.classList.add("message");

    if (type === "user") {
        message.classList.add("user-message");
        message.innerHTML = `${text}<span class="msg-time">${time}</span>`;
    } else {
        message.classList.add("ai-message");
        let formattedText = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br>")
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        message.innerHTML = `${formattedText}<span class="msg-time">${time}</span>`;
    }
    messages.appendChild(message);
}

async function sendQuestion(tabName) {
    if (!currentUser) return;
    const input = document.getElementById(`input-${tabName}`);
    const question = input.value.trim();
    if (!question) return;

    const sendButton = document.querySelector(`#view-${tabName} .send-button`);
    sendButton.disabled = true;
    input.disabled = true;
    const currentTime = getFormattedTime();

    saveStoredMessage(tabName, question, "user");
    appendMessageElement(tabName, question, "user", currentTime);
    
    input.value = "";
    scrollToBottom(tabName);
    showTyping(tabName);

    try {
        const response = await fetch(CHAT_WEBHOOK, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                aluno_id: currentUser.id, nome: currentUser.nome, email: currentUser.email,
                modulo_ativo: tabName, pergunta: question
            })
        });

        if (!response.ok) throw new Error("Erro HTTP");
        const data = await response.json();
        removeTyping(tabName);

        if (!data.resposta) throw new Error("Resposta vazia.");
        saveStoredMessage(tabName, data.resposta, "ai");
        appendMessageElement(tabName, data.resposta, "ai", getFormattedTime());

    } catch (error) {
        removeTyping(tabName);
        const errMsg = "Não foi possível obter uma resposta do servidor.";
        saveStoredMessage(tabName, errMsg, "ai");
        appendMessageElement(tabName, errMsg, "ai", getFormattedTime());
    } finally {
        sendButton.disabled = false; input.disabled = false; input.focus(); scrollToBottom(tabName);
    }
}

function showTyping(tabName) {
    removeTyping(tabName);
    const messages = document.getElementById(`messages-${tabName}`);
    const typing = document.createElement("div");
    typing.id = `typing-${tabName}`;
    typing.classList.add("message", "ai-message", "typing");
    typing.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
    messages.appendChild(typing);
    scrollToBottom(tabName);
}

function removeTyping(tabName) {
    const typing = document.getElementById(`typing-${tabName}`);
    if (typing) typing.remove();
}

function scrollToBottom(tabName) {
    const messages = document.getElementById(`messages-${tabName}`);
    if (messages) messages.scrollTop = messages.scrollHeight;
}

function handleKey(event, tabName) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendQuestion(tabName);
    }
}