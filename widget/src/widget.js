(function() {
  'use strict';

  // Configuration par défaut
  const config = window.chatbotConfig || {
    agentId: 1,
    apiUrl: 'http://localhost:3001'
  };

  let sessionId = null;
  let isOpen = false;

  // Fonctions utilitaires couleur
  function darkenHex(hex, amount) {
    var r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
    var g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
    var b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
    var toH = function(n) { var s = n.toString(16); return s.length === 1 ? '0' + s : s; };
    return '#' + toH(r) + toH(g) + toH(b);
  }

  function hexToRgba(hex, alpha) {
    return 'rgba(' + parseInt(hex.slice(1,3),16) + ',' + parseInt(hex.slice(3,5),16) + ',' + parseInt(hex.slice(5,7),16) + ',' + alpha + ')';
  }

  var widgetColor = config.widgetColor || '#667eea';
  var widgetColorDark = darkenHex(widgetColor, 40);
  var widgetTextColor = (0.299 * parseInt(widgetColor.slice(1,3),16) + 0.587 * parseInt(widgetColor.slice(3,5),16) + 0.114 * parseInt(widgetColor.slice(5,7),16)) / 255 > 0.5 ? '#2d3748' : '#ffffff';
  var widgetShadow = hexToRgba(widgetColor, 0.4);
  var widgetShadowStrong = hexToRgba(widgetColor, 0.6);
  var widgetGradient = 'linear-gradient(135deg, ' + widgetColor + ' 0%, ' + widgetColorDark + ' 100%)';

  // Générer un UUID simple pour la session
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Créer les styles CSS
  function injectStyles() {
    const styles = `
      #chatbot-widget {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      }

      #chatbot-button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${widgetGradient};
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 20px ${widgetShadow};
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }

      #chatbot-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 30px ${widgetShadowStrong};
      }

      #chatbot-button svg {
        width: 30px;
        height: 30px;
        fill: ${widgetTextColor};
      }

      #chatbot-window {
        position: fixed;
        bottom: 100px;
        right: 20px;
        width: 380px;
        height: 550px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        display: none;
        flex-direction: column;
        overflow: hidden;
        opacity: 0;
        transform: scale(0.95) translateY(10px);
        transition: opacity 0.3s ease, transform 0.3s ease;
      }

      #chatbot-window.open {
        display: flex;
        animation: chatbot-window-open 0.3s ease forwards;
      }

      @keyframes chatbot-window-open {
        from {
          opacity: 0;
          transform: scale(0.95) translateY(10px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      #chatbot-header {
        background: ${widgetGradient};
        color: ${widgetTextColor};
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      #chatbot-header h3 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
      }

      #chatbot-close {
        background: transparent;
        border: none;
        color: ${widgetTextColor};
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      #chatbot-close:hover {
        opacity: 0.8;
      }

      #chatbot-messages {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
        background: #f7fafc;
      }

      .chatbot-message {
        margin-bottom: 1rem;
        display: flex;
        gap: 0.5rem;
      }

      .chatbot-message.user {
        flex-direction: row-reverse;
      }

      .chatbot-message-content {
        max-width: 70%;
        padding: 0.75rem 1rem;
        border-radius: 12px;
        line-height: 1.6;
        font-size: 0.9rem;
      }

      .chatbot-message-content p {
        margin: 0 0 0.5em 0;
      }

      .chatbot-message-content p:last-child {
        margin-bottom: 0;
      }

      .chatbot-message-content ul {
        margin: 0.4em 0;
        padding-left: 1.3em;
      }

      .chatbot-message-content li {
        margin-bottom: 0.25em;
      }

      .chatbot-message-content strong {
        font-weight: 600;
      }

      .chatbot-message.bot .chatbot-message-content {
        background: white;
        color: #2d3748;
        border: 1px solid #e2e8f0;
      }

      .chatbot-message.user .chatbot-message-content {
        background: ${widgetGradient};
        color: ${widgetTextColor};
      }

      #chatbot-input-area {
        padding: 1rem;
        background: white;
        border-top: 1px solid #e2e8f0;
        display: flex;
        gap: 0.5rem;
      }

      #chatbot-input {
        flex: 1;
        padding: 0.75rem;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-size: 0.9rem;
        font-family: inherit;
        outline: none;
        resize: none;
        min-height: 42px;
        max-height: 200px;
        overflow-y: auto;
        line-height: 1.5;
        transition: height 0.1s ease;
      }

      #chatbot-input::-webkit-scrollbar {
        width: 6px;
      }

      #chatbot-input::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
      }

      #chatbot-input::-webkit-scrollbar-thumb {
        background: #cbd5e0;
        border-radius: 10px;
      }

      #chatbot-input::-webkit-scrollbar-thumb:hover {
        background: #a0aec0;
      }

      #chatbot-input:focus {
        border-color: ${widgetColor};
      }

      #chatbot-send {
        padding: 0.75rem 1.25rem;
        background: ${widgetGradient};
        color: ${widgetTextColor};
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: opacity 0.3s ease;
      }

      #chatbot-send:hover {
        opacity: 0.9;
      }

      #chatbot-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .chatbot-loading {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${widgetColor};
        animation: chatbot-pulse 1.4s infinite ease-in-out both;
      }

      .chatbot-loading:nth-child(1) {
        animation-delay: -0.32s;
      }

      .chatbot-loading:nth-child(2) {
        animation-delay: -0.16s;
      }

      @keyframes chatbot-pulse {
        0%, 80%, 100% {
          transform: scale(0);
        }
        40% {
          transform: scale(1);
        }
      }

      @media (max-width: 480px) {
        #chatbot-widget {
          bottom: 10px;
          right: 10px;
        }

        #chatbot-button {
          width: 56px;
          height: 56px;
        }

        #chatbot-button svg {
          width: 26px;
          height: 26px;
        }

        #chatbot-window {
          bottom: 80px;
          right: 10px;
          width: calc(100vw - 30px);
          max-width: 340px;
          height: 450px;
          max-height: calc(100vh - 140px);
        }

        #chatbot-header h3 {
          font-size: 1rem;
        }

        #chatbot-input-area {
          padding: 0.75rem;
        }

        #chatbot-send {
          padding: 0.75rem 1rem;
          font-size: 0.85rem;
        }

        .chatbot-message-content {
          max-width: 80%;
          font-size: 0.85rem;
        }
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  // Créer le HTML du widget
  function createWidget() {
    const widgetHTML = `
      <div id="chatbot-widget">
        <button id="chatbot-button" aria-label="Ouvrir le chat">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            <path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
          </svg>
        </button>

        <div id="chatbot-window">
          <div id="chatbot-header">
            <h3>💬 Assistant Service Client</h3>
            <button id="chatbot-close" aria-label="Fermer le chat">×</button>
          </div>

          <div id="chatbot-messages">
            <div class="chatbot-message bot">
              <div class="chatbot-message-content">
                Bonjour! Comment puis-je vous aider aujourd'hui?
              </div>
            </div>
          </div>

          <div id="chatbot-input-area">
            <textarea
              id="chatbot-input"
              placeholder="Tapez votre message..."
              autocomplete="off"
              rows="1"
            ></textarea>
            <button id="chatbot-send">Envoyer</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', widgetHTML);
  }

  // Echapper le HTML pour eviter les injections XSS
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Convertir le markdown basique en HTML (securise)
  function formatBotMessage(text) {
    // Echapper le HTML d'abord
    var html = escapeHtml(text);

    // Gras : **texte** → <strong>texte</strong>
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Separer en lignes pour traiter les listes
    var lines = html.split('\n');
    var result = [];
    var inList = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var bulletMatch = line.match(/^[-•]\s+(.+)/);

      if (bulletMatch) {
        if (!inList) {
          result.push('<ul>');
          inList = true;
        }
        result.push('<li>' + bulletMatch[1] + '</li>');
      } else {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        if (line.trim() === '') {
          result.push('<br>');
        } else {
          result.push('<p>' + line + '</p>');
        }
      }
    }
    if (inList) {
      result.push('</ul>');
    }

    return result.join('');
  }

  // Ajouter un message au chat
  function addMessage(content, type, useTypewriter = false) {
    const messagesContainer = document.getElementById('chatbot-messages');

    if (type === 'bot' && useTypewriter) {
      // Creer le conteneur vide pour l'effet typewriter
      const messageHTML = `
        <div class="chatbot-message ${type}">
          <div class="chatbot-message-content" data-typewriter="true"></div>
        </div>
      `;
      messagesContainer.insertAdjacentHTML('beforeend', messageHTML);

      const msgs = messagesContainer.querySelectorAll('.chatbot-message.bot');
      const lastMessage = msgs[msgs.length - 1];
      const contentElement = lastMessage.querySelector('.chatbot-message-content');

      // Typewriter : on tape le texte brut puis on remplace par le HTML formate a la fin
      let index = 0;
      const speed = 20;

      function typeNextChar() {
        if (index < content.length) {
          var ch = content.charAt(index);
          if (ch === '\n') {
            contentElement.appendChild(document.createElement('br'));
          } else {
            contentElement.appendChild(document.createTextNode(ch));
          }
          index++;
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
          setTimeout(typeNextChar, speed);
        } else {
          // Typewriter termine : remplacer par le HTML formate
          contentElement.innerHTML = formatBotMessage(content);
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }

      typeNextChar();
    } else {
      // Message sans typewriter
      var formattedContent = (type === 'bot') ? formatBotMessage(content) : escapeHtml(content);
      const messageHTML = `
        <div class="chatbot-message ${type}">
          <div class="chatbot-message-content">${formattedContent}</div>
        </div>
      `;
      messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Afficher l'indicateur de chargement
  function showLoading() {
    const messagesContainer = document.getElementById('chatbot-messages');
    const loadingHTML = `
      <div class="chatbot-message bot" id="chatbot-loading-message">
        <div class="chatbot-message-content">
          <span class="chatbot-loading"></span>
          <span class="chatbot-loading"></span>
          <span class="chatbot-loading"></span>
        </div>
      </div>
    `;
    messagesContainer.insertAdjacentHTML('beforeend', loadingHTML);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Masquer l'indicateur de chargement
  function hideLoading() {
    const loadingMessage = document.getElementById('chatbot-loading-message');
    if (loadingMessage) {
      loadingMessage.remove();
    }
  }

  // Envoyer un message à l'API
  async function sendMessage(message) {
    if (!message.trim()) return;

    // Initialiser la session si nécessaire
    if (!sessionId) {
      sessionId = generateUUID();
    }

    // Ajouter le message de l'utilisateur
    addMessage(message, 'user');

    // Désactiver l'input
    const input = document.getElementById('chatbot-input');
    const sendButton = document.getElementById('chatbot-send');
    input.disabled = true;
    sendButton.disabled = true;

    // Afficher le chargement
    showLoading();

    try {
      const response = await fetch(`${config.apiUrl}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentId: config.agentId,
          sessionId: sessionId,
          message: message
        })
      });

      const data = await response.json();

      // Masquer le chargement
      hideLoading();

      // Ajouter la réponse du bot avec effet typewriter
      addMessage(data.response, 'bot', true);

    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      hideLoading();
      addMessage('Désolé, une erreur s\'est produite. Veuillez réessayer.', 'bot');
    } finally {
      // Réactiver l'input
      input.disabled = false;
      sendButton.disabled = false;
      input.focus();
    }
  }

  // Auto-resize textarea avec adaptation fluide
  function autoResizeTextarea(textarea) {
    // Réinitialiser la hauteur pour recalculer
    textarea.style.height = 'auto';

    // Calculer la nouvelle hauteur (max 200px)
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = newHeight + 'px';

    // Scroller automatiquement vers le bas du textarea si débordement
    if (textarea.scrollHeight > 200) {
      textarea.scrollTop = textarea.scrollHeight;
    }
  }

  // Initialiser le widget
  function init() {
    injectStyles();
    createWidget();

    // Event listeners
    const button = document.getElementById('chatbot-button');
    const closeButton = document.getElementById('chatbot-close');
    const chatWindow = document.getElementById('chatbot-window');
    const input = document.getElementById('chatbot-input');
    const sendButton = document.getElementById('chatbot-send');

    button.addEventListener('click', () => {
      isOpen = !isOpen;
      if (isOpen) {
        chatWindow.classList.add('open');
        input.focus();
      } else {
        chatWindow.classList.remove('open');
      }
    });

    closeButton.addEventListener('click', () => {
      isOpen = false;
      chatWindow.classList.remove('open');
    });

    // Auto-resize sur input
    input.addEventListener('input', () => {
      autoResizeTextarea(input);
    });

    sendButton.addEventListener('click', () => {
      const message = input.value;
      input.value = '';
      autoResizeTextarea(input);
      sendMessage(message);
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const message = input.value;
        input.value = '';
        autoResizeTextarea(input);
        sendMessage(message);
      }
    });
  }

  // Attendre que le DOM soit chargé
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
