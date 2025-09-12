/* --------------- CONFIG --------------- */
const API_CHAT = "https://thamai-monorepo-backend.onrender.com/chat"; // change if needed
const AVATAR_USER = "user.png"; // local file or URL (ensure correct name)
const AVATAR_BOT  = "bot.png";
const AUTO_MIC_AFTER_TTS = true; // bot nói xong -> tự bật mic (nếu muốn)

/* --------------- DOM --------------- */
const chatbox = document.getElementById("chatbox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const voiceSelect = document.getElementById("voiceSelect");
const debugBtn = document.getElementById("debugBtn");
const debugPanel = document.getElementById("debugPanel");
const clearBtn = document.getElementById("clearBtn");
const saveBtn = document.getElementById("saveBtn");
const loadBtn = document.getElementById("loadBtn");
const downloadBtn = document.getElementById("downloadBtn");
const muteBtn = document.getElementById("muteBtn");
const darkModeBtn = document.getElementById("darkModeBtn");

/* --------------- STATE --------------- */
let voices = [];
let selectedVoiceIdx = null;
let isRecognizing = false;
let recognition = null;
let lastTranscript = "";
let waitingForReply = false;
let debugMode = false;
let muteTTS = false;

/* --------------- UTILITIES --------------- */
function dbg(...args){
  console.log(...args);
  if(debugMode && debugPanel){
    const line = args.map(a => (typeof a==="object"? JSON.stringify(a): String(a))).join(" ");
    debugPanel.innerHTML += `<div>> ${escapeHtml(line)}</div>`;
    debugPanel.scrollTop = debugPanel.scrollHeight;
  }
}
function escapeHtml(s){ return s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }

/* --------------- VOICES --------------- */
function populateVoices(){
  voices = speechSynthesis.getVoices() || [];
  voiceSelect.innerHTML = "";
  voices.forEach((v,i)=>{
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `${v.name} (${v.lang})` + (v.lang.startsWith("vi") ? " 🇻🇳": "");
    voiceSelect.appendChild(opt);
  });
  if(voices.length) selectedVoiceIdx = 0;
}
speechSynthesis.onvoiceschanged = populateVoices;
populateVoices();

/* --------------- UI: MESSAGE RENDER --------------- */
function createMessageElement(sender, text, opts = {}){
  const wrap = document.createElement("div");
  wrap.className = `message ${sender}`;
  // avatar
  const img = document.createElement("img");
  img.className = "avatar";
  img.alt = sender;
  img.src = (sender === "user") ? AVATAR_USER : AVATAR_BOT;
  // bubble
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  // assemble (user to right)
  if(sender === "user"){
    wrap.appendChild(bubble);
    wrap.appendChild(img);
  } else {
    wrap.appendChild(img);
    wrap.appendChild(bubble);
  }
  // typing animation
  if(opts.typing){
    bubble.innerHTML = `<span class="typing"><span></span><span></span><span></span></span>`;
  }
  return { wrap, bubble };
}

function appendMessage(sender, text, opts = {}){
  const {wrap, bubble} = createMessageElement(sender, text, opts);
  chatbox.appendChild(wrap);
  chatbox.scrollTop = chatbox.scrollHeight;
  return {wrap, bubble};
}

/* --------------- STORAGE (localStorage) --------------- */
const STORAGE_KEY = "thamai_history_v1";
function saveHistoryToLocal(messages){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); dbg("Saved history to localStorage"); }
  catch(e){ dbg("Failed to save history", e); }
}
function loadHistoryFromLocal(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  } catch(e){ dbg("Failed to load history", e); return null; }
}
function renderHistory(messages){
  chatbox.innerHTML = "";
  messages.forEach(m => appendMessage(m.sender, m.text));
}

/* --------------- TTS (speechSynthesis) --------------- */
function speakText(text){
  if(muteTTS) { dbg("TTS muted — skip speak"); return Promise.resolve(); }
  if(!("speechSynthesis" in window)) { dbg("No speechSynthesis"); return Promise.resolve(); }

  // stop recognition to avoid capturing TTS
  stopRecognition();

  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    if(voices[selectedVoiceIdx]) u.voice = voices[selectedVoiceIdx];
    u.lang = "vi-VN";
    u.rate = 1.0;
    u.pitch = 1.0;
    u.onend = () => {
      dbg("TTS ended");
      if(AUTO_MIC_AFTER_TTS && !muteTTS){
        // resume mic if previously was active (we just auto-start)
        startRecognitionSafe();
      }
      resolve();
    };
    u.onerror = (e) => { dbg("TTS error", e); resolve(); };
    speechSynthesis.speak(u);
  });
}

/* --------------- SPEECH RECOGNITION (single instance) --------------- */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if(SpeechRecognition){
  recognition = new SpeechRecognition();
  recognition.lang = "vi-VN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onstart = () => { isRecognizing = true; micBtn.classList.add("listening"); dbg("recognition.onstart"); };
  recognition.onend = () => { isRecognizing = false; micBtn.classList.remove("listening"); dbg("recognition.onend"); };
  recognition.onerror = (e) => { dbg("recognition.onerror", e); isRecognizing=false; micBtn.classList.remove("listening"); };

  recognition.onresult = (ev) => {
    const transcript = ev.results[0][0].transcript.trim();
    dbg("STT result:", transcript);

    // ignore duplicates / too short
    if(!transcript || transcript.length < 1) { dbg("Ignored short transcript"); return; }
    if(transcript === lastTranscript){ dbg("Ignored duplicate transcript"); return; }
    lastTranscript = transcript;

    // show transcript in input and send message
    userInput.value = transcript;
    sendMessage();
  };
}

/* Safe start/stop recognition helpers */
function startRecognitionSafe(){
  if(!recognition) return;
  if(isRecognizing) { dbg("Recognition already running"); return; }
  try { recognition.start(); }
  catch(e){ dbg("recognition.start exception:", e); }
}
function stopRecognition(){
  if(!recognition) return;
  try {
    recognition.stop();
  } catch(e){ dbg("recognition.stop exception:", e); }
}

/* --------------- NETWORK: fetch with retry --------------- */
async function postJsonWithRetry(url, body, tries = 3){
  let delay = 500;
  for(let i=0;i<tries;i++){
    try {
      const res = await fetch(url, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify(body)
      });
      return res;
    } catch(err){
      dbg(`Fetch attempt ${i+1} failed`, err);
      if(i < tries-1) await new Promise(r=>setTimeout(r, delay));
      delay *= 2;
    }
  }
  throw new Error("Network failed after retries");
}

/* --------------- CHAT FLOW --------------- */
function getHistoryAsArray(){
  // read current DOM messages into array for saving
  const nodes = chatbox.querySelectorAll(".message");
  const arr = [];
  nodes.forEach(n=>{
    const sender = n.classList.contains("user") ? "user" : "bot";
    const text = n.querySelector(".bubble")?.textContent || "";
    arr.push({sender, text, t: Date.now()});
  });
  return arr;
}

async function sendMessage(){
  if(waitingForReply) { dbg("Still waiting for reply — ignore send"); return; }
  const text = userInput.value.trim();
  if(!text) return;

  // render user message
  appendMessage("user", text);
  userInput.value = "";
  waitingForReply = true;

  // typing indicator (bot)
  const typingEl = appendMessage("bot", "", {typing:true});
  // prepare body
  const body = { message: text };

  try {
    const res = await postJsonWithRetry(API_CHAT, body, 3);
    if(!res.ok){
      const statusText = `${res.status} ${res.statusText}`;
      dbg("HTTP error:", statusText);
      // read body message if any
      let errText = `Lỗi server: ${statusText}`;
      try {
        const json = await res.json();
        if(json.error) errText = `Lỗi server: ${json.error}`;
      } catch(e){}
      // replace typing
      typingEl.remove();
      appendMessage("bot", errText);
      dbg("Displayed backend error to user");
      waitingForReply = false;
      return;
    }

    const data = await res.json();
    if(data.error){
      typingEl.remove();
      appendMessage("bot", `Lỗi backend: ${data.error}`);
      dbg("Backend returned error:", data.error);
      waitingForReply = false;
      return;
    }

    const reply = data.reply || "Xin lỗi, Thắm AI chưa hiểu.";
    // replace typing with real reply
    typingEl.remove();
    appendMessage("bot", reply);

    // speak (await so mic won't start while speaking)
    await speakText(reply);

  } catch(err){
    dbg("sendMessage failure:", err);
    try { typingEl.remove(); } catch(e){}
    appendMessage("bot", "⚠️ Lỗi kết nối. Vui lòng thử lại.");
  } finally {
    waitingForReply = false;
    // persist small history automatically
    try {
      const hist = getHistoryAsArray();
      saveHistoryToLocal(hist);
    } catch(e){}
  }
}

/* --------------- UI EVENTS --------------- */
sendBtn.addEventListener("click", ()=> sendMessage());
userInput.addEventListener("keypress", (e)=> { if(e.key === "Enter") sendMessage(); });

micBtn.addEventListener("click", ()=>{
  if(isRecognizing) stopRecognition();
  else startRecognitionSafe();
});

voiceSelect.addEventListener("change", ()=> { selectedVoiceIdx = parseInt(voiceSelect.value); });

debugBtn.addEventListener("click", ()=>{
  debugMode = !debugMode;
  debugPanel.style.display = debugMode ? "block":"none";
  debugPanel.setAttribute("aria-hidden", !debugMode);
  if(debugMode) dbg("🐞 Debug ON");
});

clearBtn.addEventListener("click", ()=>{
  if(confirm("Xác nhận xóa toàn bộ chat?")) {
    chatbox.innerHTML = "";
    localStorage.removeItem(STORAGE_KEY);
  }
});
saveBtn.addEventListener("click", ()=>{
  const hist = getHistoryAsArray();
  try {
    localStorage.setItem(STORAGE_KEY + "_manual", JSON.stringify(hist));
    alert("Saved conversation into localStorage (manual)");
  } catch(e){ alert("Save failed: " + e.message); }
});
loadBtn.addEventListener("click", ()=>{
  const raw = localStorage.getItem(STORAGE_KEY + "_manual");
  if(!raw){ alert("Không tìm thấy saved conversation."); return; }
  try {
    const arr = JSON.parse(raw);
    chatbox.innerHTML = "";
    arr.forEach(m => appendMessage(m.sender, m.text));
  } catch(e){ alert("Load failed: " + e.message); }
});
downloadBtn.addEventListener("click", ()=>{
  const arr = getHistoryAsArray();
  const txt = arr.map(m => `[${m.sender}] ${m.text}`).join("\n");
  const blob = new Blob([txt], {type:"text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "thamai_transcript.txt"; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
});

muteBtn.addEventListener("click", ()=>{
  muteTTS = !muteTTS;
  muteBtn.textContent = muteTTS ? "🔇" : "🔈";
});

darkModeBtn.addEventListener("click", ()=>{
  document.body.classList.toggle("dark");
});

/* --------------- INITIALIZE UI from local storage --------------- */
(function init(){
  // voice list
  populateVoices();
  // load auto history
  const saved = loadHistoryFromLocal();
  if(saved && Array.isArray(saved) && saved.length){
    renderHistory(saved);
  } else {
    appendMessage("bot", "Xin chào! Tôi là Thắm AI. Bạn cần giúp gì?"); // starter
  }
})();
