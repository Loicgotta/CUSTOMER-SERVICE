(()=>{(function(){"use strict";let b=window.chatbotConfig||{agentId:1,apiUrl:"http://localhost:3001"},p=null,h=!1;function H(t,o){var n=Math.max(0,parseInt(t.slice(1,3),16)-o),e=Math.max(0,parseInt(t.slice(3,5),16)-o),s=Math.max(0,parseInt(t.slice(5,7),16)-o),a=function(r){var c=r.toString(16);return c.length===1?"0"+c:c};return"#"+a(n)+a(e)+a(s)}function x(t,o){return"rgba("+parseInt(t.slice(1,3),16)+","+parseInt(t.slice(3,5),16)+","+parseInt(t.slice(5,7),16)+","+o+")"}var i=b.widgetColor||"#667eea",M=H(i,40),d=(.299*parseInt(i.slice(1,3),16)+.587*parseInt(i.slice(3,5),16)+.114*parseInt(i.slice(5,7),16))/255>.5?"#2d3748":"#ffffff",L=x(i,.4),T=x(i,.6),g="linear-gradient(135deg, "+i+" 0%, "+M+" 100%)";function E(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(t){let o=Math.random()*16|0;return(t==="x"?o:o&3|8).toString(16)})}function $(){let t=`
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
        background: ${g};
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 20px ${L};
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }

      #chatbot-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 30px ${T};
      }

      #chatbot-button svg {
        width: 30px;
        height: 30px;
        fill: ${d};
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
        background: ${g};
        color: ${d};
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
        color: ${d};
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

      .chatbot-message-content p {
        margin: 0 0 0.4em 0;
      }

      .chatbot-message-content p:last-child {
        margin-bottom: 0;
      }

      .chatbot-message-content ul {
        margin: 0.3em 0;
        padding-left: 1.2em;
      }

      .chatbot-message-content li {
        margin-bottom: 0.2em;
      }

      .chatbot-message-content br {
        display: block;
        content: "";
        margin-top: 0.3em;
      }

      .chatbot-message.user .chatbot-message-content {
        background: ${g};
        color: ${d};
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
        background: ${g};
        color: ${d};
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
    `,o=document.createElement("style");o.textContent=t,document.head.appendChild(o)}function z(){document.body.insertAdjacentHTML("beforeend",`
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
    `)}function v(t){var o=t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");o=o.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>"),o=o.replace(/\*(.+?)\*/g,"<em>$1</em>");for(var n=o.split(`
`),e="",s=!1,a=0;a<n.length;a++){var r=n[a],c=r.match(/^\s*[-•]\s+(.*)/);if(c)s||(e+="<ul>",s=!0),e+="<li>"+c[1]+"</li>";else{s&&(e+="</ul>",s=!1);var l=r.trim();l===""?e+="<br>":e+="<p>"+l+"</p>"}}return s&&(e+="</ul>"),e}function m(t,o,n=!1){let e=document.getElementById("chatbot-messages");if(o==="bot"&&n){let I=function(){f<t.length?(l.textContent+=t.charAt(f),f++,e.scrollTop=e.scrollHeight,setTimeout(I,B)):(l.innerHTML=v(t),e.scrollTop=e.scrollHeight)},a=`
        <div class="chatbot-message ${o}">
          <div class="chatbot-message-content" data-typewriter="true"></div>
        </div>
      `;e.insertAdjacentHTML("beforeend",a);let r=e.querySelectorAll(".chatbot-message.bot"),l=r[r.length-1].querySelector(".chatbot-message-content"),f=0,B=5;I()}else{var s=o==="bot"?v(t):t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>");let a=`
        <div class="chatbot-message ${o}">
          <div class="chatbot-message-content">${s}</div>
        </div>
      `;e.insertAdjacentHTML("beforeend",a),e.scrollTop=e.scrollHeight}}function S(){let t=document.getElementById("chatbot-messages");t.insertAdjacentHTML("beforeend",`
      <div class="chatbot-message bot" id="chatbot-loading-message">
        <div class="chatbot-message-content">
          <span class="chatbot-loading"></span>
          <span class="chatbot-loading"></span>
          <span class="chatbot-loading"></span>
        </div>
      </div>
    `),t.scrollTop=t.scrollHeight}function w(){let t=document.getElementById("chatbot-loading-message");t&&t.remove()}async function y(t){if(!t.trim())return;p||(p=E()),m(t,"user");let o=document.getElementById("chatbot-input"),n=document.getElementById("chatbot-send");o.disabled=!0,n.disabled=!0,S();try{let s=await(await fetch(`${b.apiUrl}/api/chat/message`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agentId:b.agentId,sessionId:p,message:t})})).json();w(),m(s.response,"bot",!0)}catch(e){console.error("Erreur lors de l'envoi du message:",e),w(),m("D\xE9sol\xE9, une erreur s'est produite. Veuillez r\xE9essayer.","bot")}finally{o.disabled=!1,n.disabled=!1,o.focus()}}function u(t){t.style.height="auto";let o=Math.min(t.scrollHeight,200);t.style.height=o+"px",t.scrollHeight>200&&(t.scrollTop=t.scrollHeight)}function k(){$(),z();let t=document.getElementById("chatbot-button"),o=document.getElementById("chatbot-close"),n=document.getElementById("chatbot-window"),e=document.getElementById("chatbot-input"),s=document.getElementById("chatbot-send");t.addEventListener("click",()=>{h=!h,h?(n.classList.add("open"),e.focus()):n.classList.remove("open")}),o.addEventListener("click",()=>{h=!1,n.classList.remove("open")}),e.addEventListener("input",()=>{u(e)}),s.addEventListener("click",()=>{let a=e.value;e.value="",u(e),y(a)}),e.addEventListener("keypress",a=>{if(a.key==="Enter"&&!a.shiftKey){a.preventDefault();let r=e.value;e.value="",u(e),y(r)}})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",k):k()})();})();
