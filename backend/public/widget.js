(()=>{(function(){"use strict";let g=window.chatbotConfig||{agentId:1,apiUrl:"http://localhost:3001"},b=null,d=!1;function L(t,e){var n=Math.max(0,parseInt(t.slice(1,3),16)-e),o=Math.max(0,parseInt(t.slice(3,5),16)-e),s=Math.max(0,parseInt(t.slice(5,7),16)-e),a=function(h){var c=h.toString(16);return c.length===1?"0"+c:c};return"#"+a(n)+a(o)+a(s)}function f(t,e){return"rgba("+parseInt(t.slice(1,3),16)+","+parseInt(t.slice(3,5),16)+","+parseInt(t.slice(5,7),16)+","+e+")"}var i=g.widgetColor||"#667eea",$=L(i,40),r=(.299*parseInt(i.slice(1,3),16)+.587*parseInt(i.slice(3,5),16)+.114*parseInt(i.slice(5,7),16))/255>.5?"#2d3748":"#ffffff",I=f(i,.4),M=f(i,.6),l="linear-gradient(135deg, "+i+" 0%, "+$+" 100%)";function E(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(t){let e=Math.random()*16|0;return(t==="x"?e:e&3|8).toString(16)})}function H(){let t=`
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
        background: ${l};
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 20px ${I};
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }

      #chatbot-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 30px ${M};
      }

      #chatbot-button svg {
        width: 30px;
        height: 30px;
        fill: ${r};
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
        background: ${l};
        color: ${r};
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
        color: ${r};
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
        line-height: 1.8;
        font-size: 0.9rem;
        white-space: pre-wrap;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }

      .chatbot-message-content br {
        display: block;
        content: "";
        margin-bottom: 0.5em;
      }

      .chatbot-message-content .paragraph-break {
        display: block;
        height: 1.2em;
      }

      .chatbot-message-content > div {
        margin: 0.5em 0;
      }

      .chatbot-message-content ul, .chatbot-message-content ol {
        margin: 0.8em 0;
        padding-left: 1.5em;
      }

      .chatbot-message-content li {
        margin: 0.4em 0;
      }

      .chatbot-message.bot .chatbot-message-content {
        background: white;
        color: #2d3748;
        border: 1px solid #e2e8f0;
      }

      .chatbot-message.user .chatbot-message-content {
        background: ${l};
        color: ${r};
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
        border-color: ${i};
      }

      #chatbot-send {
        padding: 0.75rem 1.25rem;
        background: ${l};
        color: ${r};
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
        background: ${i};
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
    `,e=document.createElement("style");e.textContent=t,document.head.appendChild(e)}function T(){document.body.insertAdjacentHTML("beforeend",`
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
    `)}function x(t){if(!t)return"";let e=t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");return e=e.replace(/\[([^\]]+)\]\(([^)]+)\)/g,(n,o,s)=>`###LINK###${o}###URL###${s}###ENDLINK###`),e=e.replace(/\n\n+/g,"###PARAGRAPH###"),e=e.replace(/^[•\-]\s(.+)$/gm,"###BULLET###$1"),e=e.replace(/^(\d+)\.\s(.+)$/gm,"###NUMBER###$1. $2"),e=e.replace(/\n/g,"<br>"),e=e.replace(/###PARAGRAPH###/g,'<div class="paragraph-break"></div>'),e=e.replace(/###BULLET###(.+?)(<br>|<div|$)/g,'<div style="margin: 0.5em 0; padding-left: 1.5em; text-indent: -1.2em;">\u2022 $1</div>'),e=e.replace(/###NUMBER###(.+?)(<br>|<div|$)/g,'<div style="margin: 0.5em 0; padding-left: 1.5em; text-indent: -1.2em;">$1</div>'),e=e.replace(/###LINK###([^#]+)###URL###([^#]+)###ENDLINK###/g,(n,o,s)=>`<a href="${s.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")}" target="_blank" rel="noopener noreferrer" style="color: ${i}; text-decoration: underline; font-weight: 500;">${o}</a>`),e}function p(t,e,n=!1){let o=document.getElementById("chatbot-messages");if(e==="bot"&&n){let k=function(){if(u<t.length){let S=t.substring(0,u+1);c.innerHTML=x(S),u++,o.scrollTop=o.scrollHeight,setTimeout(k,z)}},s=`
        <div class="chatbot-message ${e}">
          <div class="chatbot-message-content" data-typewriter="true"></div>
        </div>
      `;o.insertAdjacentHTML("beforeend",s);let a=o.querySelectorAll(".chatbot-message.bot"),c=a[a.length-1].querySelector(".chatbot-message-content"),u=0,z=5;k()}else{let s=e==="bot"?x(t):t.replace(/\n/g,"<br>"),a=`
        <div class="chatbot-message ${e}">
          <div class="chatbot-message-content">${s}</div>
        </div>
      `;o.insertAdjacentHTML("beforeend",a),o.scrollTop=o.scrollHeight}}function B(){let t=document.getElementById("chatbot-messages");t.insertAdjacentHTML("beforeend",`
      <div class="chatbot-message bot" id="chatbot-loading-message">
        <div class="chatbot-message-content">
          <span class="chatbot-loading"></span>
          <span class="chatbot-loading"></span>
          <span class="chatbot-loading"></span>
        </div>
      </div>
    `),t.scrollTop=t.scrollHeight}function v(){let t=document.getElementById("chatbot-loading-message");t&&t.remove()}async function w(t){if(!t.trim())return;b||(b=E()),p(t,"user");let e=document.getElementById("chatbot-input"),n=document.getElementById("chatbot-send");e.disabled=!0,n.disabled=!0,B();try{let s=await(await fetch(`${g.apiUrl}/api/chat/message`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agentId:g.agentId,sessionId:b,message:t})})).json();v(),p(s.response,"bot",!0)}catch(o){console.error("Erreur lors de l'envoi du message:",o),v(),p("D\xE9sol\xE9, une erreur s'est produite. Veuillez r\xE9essayer.","bot")}finally{e.disabled=!1,n.disabled=!1,e.focus()}}function m(t){t.style.height="auto";let e=Math.min(t.scrollHeight,200);t.style.height=e+"px",t.scrollHeight>200&&(t.scrollTop=t.scrollHeight)}function y(){H(),T();let t=document.getElementById("chatbot-button"),e=document.getElementById("chatbot-close"),n=document.getElementById("chatbot-window"),o=document.getElementById("chatbot-input"),s=document.getElementById("chatbot-send");t.addEventListener("click",()=>{d=!d,d?(n.classList.add("open"),o.focus()):n.classList.remove("open")}),e.addEventListener("click",()=>{d=!1,n.classList.remove("open")}),o.addEventListener("input",()=>{m(o)}),s.addEventListener("click",()=>{let a=o.value;o.value="",m(o),w(a)}),o.addEventListener("keypress",a=>{if(a.key==="Enter"&&!a.shiftKey){a.preventDefault();let h=o.value;o.value="",m(o),w(h)}})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",y):y()})();})();
