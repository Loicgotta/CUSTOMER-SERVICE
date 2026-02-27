(()=>{(function(){"use strict";let l=window.chatbotConfig||{agentId:1,apiUrl:"http://localhost:3001"},h=null,d=!1;function w(t,e){var a=Math.max(0,parseInt(t.slice(1,3),16)-e),o=Math.max(0,parseInt(t.slice(3,5),16)-e),r=Math.max(0,parseInt(t.slice(5,7),16)-e),i=function(p){var u=p.toString(16);return u.length===1?"0"+u:u};return"#"+i(a)+i(o)+i(r)}function m(t,e){return"rgba("+parseInt(t.slice(1,3),16)+","+parseInt(t.slice(3,5),16)+","+parseInt(t.slice(5,7),16)+","+e+")"}var n=l.widgetColor||"#667eea",y=w(n,40),s=(.299*parseInt(n.slice(1,3),16)+.587*parseInt(n.slice(3,5),16)+.114*parseInt(n.slice(5,7),16))/255>.5?"#2d3748":"#ffffff",k=m(n,.4),I=m(n,.6),c="linear-gradient(135deg, "+n+" 0%, "+y+" 100%)";function E(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(t){let e=Math.random()*16|0;return(t==="x"?e:e&3|8).toString(16)})}function H(){let t=`
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
        background: ${c};
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 20px ${k};
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }

      #chatbot-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 30px ${I};
      }

      #chatbot-button svg {
        width: 30px;
        height: 30px;
        fill: ${s};
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
      }

      #chatbot-window.open {
        display: flex;
      }

      #chatbot-header {
        background: ${c};
        color: ${s};
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
        color: ${s};
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
        line-height: 1.5;
        font-size: 0.9rem;
      }

      .chatbot-message.bot .chatbot-message-content {
        background: white;
        color: #2d3748;
        border: 1px solid #e2e8f0;
      }

      .chatbot-message.user .chatbot-message-content {
        background: ${c};
        color: ${s};
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
        border-color: ${n};
      }

      #chatbot-send {
        padding: 0.75rem 1.25rem;
        background: ${c};
        color: ${s};
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
        background: ${n};
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
          max-width: 360px;
          height: 500px;
          max-height: calc(100vh - 120px);
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
    `,e=document.createElement("style");e.textContent=t,document.head.appendChild(e)}function L(){document.body.insertAdjacentHTML("beforeend",`
      <div id="chatbot-widget">
        <button id="chatbot-button" aria-label="Ouvrir le chat">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            <path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
          </svg>
        </button>

        <div id="chatbot-window">
          <div id="chatbot-header">
            <h3>\u{1F4AC} Assistant Service Client</h3>
            <button id="chatbot-close" aria-label="Fermer le chat">\xD7</button>
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
    `)}function b(t,e){let a=document.getElementById("chatbot-messages"),o=`
      <div class="chatbot-message ${e}">
        <div class="chatbot-message-content">${t}</div>
      </div>
    `;a.insertAdjacentHTML("beforeend",o),a.scrollTop=a.scrollHeight}function M(){let t=document.getElementById("chatbot-messages");t.insertAdjacentHTML("beforeend",`
      <div class="chatbot-message bot" id="chatbot-loading-message">
        <div class="chatbot-message-content">
          <span class="chatbot-loading"></span>
          <span class="chatbot-loading"></span>
          <span class="chatbot-loading"></span>
        </div>
      </div>
    `),t.scrollTop=t.scrollHeight}function x(){let t=document.getElementById("chatbot-loading-message");t&&t.remove()}async function f(t){if(!t.trim())return;h||(h=E()),b(t,"user");let e=document.getElementById("chatbot-input"),a=document.getElementById("chatbot-send");e.disabled=!0,a.disabled=!0,M();try{let r=await(await fetch(`${l.apiUrl}/api/chat/message`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agentId:l.agentId,sessionId:h,message:t})})).json();x(),b(r.response,"bot")}catch(o){console.error("Erreur lors de l'envoi du message:",o),x(),b("D\xE9sol\xE9, une erreur s'est produite. Veuillez r\xE9essayer.","bot")}finally{e.disabled=!1,a.disabled=!1,e.focus()}}function g(t){t.style.height="auto";let e=Math.min(t.scrollHeight,200);t.style.height=e+"px",t.scrollHeight>200&&(t.scrollTop=t.scrollHeight)}function v(){H(),L();let t=document.getElementById("chatbot-button"),e=document.getElementById("chatbot-close"),a=document.getElementById("chatbot-window"),o=document.getElementById("chatbot-input"),r=document.getElementById("chatbot-send");t.addEventListener("click",()=>{d=!d,d?(a.classList.add("open"),o.focus()):a.classList.remove("open")}),e.addEventListener("click",()=>{d=!1,a.classList.remove("open")}),o.addEventListener("input",()=>{g(o)}),r.addEventListener("click",()=>{let i=o.value;o.value="",g(o),f(i)}),o.addEventListener("keypress",i=>{if(i.key==="Enter"&&!i.shiftKey){i.preventDefault();let p=o.value;o.value="",g(o),f(p)}})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",v):v()})();})();
