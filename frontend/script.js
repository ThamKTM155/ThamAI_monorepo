/* ========== CONFIG ========== */
// Nếu index.html có định nghĩa sẵn API_CHAT thì dùng, ngược lại fallback localhost
const API_CHAT = window.API_CHAT || "http://127.0.0.1:5000/chat";

/* ========== DOM ELEMENTS ========== */
const chatbox = document.getElementById("chatbox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const smileBtn = document.getElementById("smileBtn");
const speakBtn = document.getElementById("speakBtn");
const listenBtn = document.getElementById("listenBtn");
const muteBtn = document.getElementById("muteBtn");
const darkModeBtn = document.getElementById("darkModeBtn");
const clearBtn = document.getElementById("clearBtn");
const saveBtn = document.getElementById("saveBtn");
const loadBtn = document.getElementById("loadBtn");
const downloadBtn = document.getElementById("downloadBtn");
const debugBtn = document.getElementById("debugBtn");
const debugPanel = document.getElementById("debugPanel");
const voiceSelect = document.getElementById("voiceSelect");

/* ========== STATE ========== */
let recognition;
let synth = window.speechSynthesis;
let voices = [];
let isMuted = false;

/* ========== CHAT UI ========== */
function addMessage(sender, text) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${sender}`;
  msgDiv.innerHTML = `<div class="bubble">${text}</div>`;
  chatbox.appendChild(msgDiv);
  chatbox.scrollTop = chatbox.scrollHeight;
}

/* ========== SPEECH SYNTHESIS (TTS) ========== */
function populateVoices() {
  voices = synth.getVoices();
  voiceSelect.innerHTML = "";
  voices.forEach((voice, i) => {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `${voice.name} (${voice.lang})`;
    voiceSelect.appendChild(option);
  });
}
populateVoices();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = populateVoices;
}

function speak(text) {
  if (isMuted) return;
  const utterance = new SpeechSynthesisUtterance(text);
  const selected = voices[voiceSelect.value];
  if (selected) utterance.voice = selected;
  synth.speak(utterance);
}

/* ========== SPEECH RECOGNITION (STT) ========== */
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = "vi-VN";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript.trim();
    addMessage("user", text);
    sendToBackend(text);
  };

  recognition.onerror = (event) => {
    logDebug("Lỗi mic: " + event.error);
  };
}

function startListening() {
  if (recognition) recognition.start();
}

/* ========== BACKEND CALL ========== */
async function sendToBackend(userText) {
  try {
    const response = await fetch(API_CHAT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userText }),
    });

    if (!response.ok) throw new Error("Server lỗi: " + response.status);

    const data = await response.json();
    if (data.reply) {
      addMessage("bot", data.reply);
      speak(data.reply);
    } else {
      addMessage("bot", "⚠️ Backend không trả lời hợp lệ.");
    }
  } catch (err) {
    // fallback: trả lời giả lập khi server down
    const fallback = "🤖 (Giả lập) Tôi chưa kết nối được server, nhưng tôi vẫn lắng nghe bạn!";
    addMessage("bot", fallback);
    speak(fallback);
    logDebug("Fetch error: " + err);
  }
}

/* ========== EVENT HANDLERS ========== */
sendBtn.onclick = () => {
  const text = userInput.value.trim();
  if (!text) return;
  addMessage("user", text);
  userInput.value = "";
  sendToBackend(text);
};

micBtn.onclick = () => startListening();

smileBtn.onclick = () => addMessage("bot", "😊 Tôi đang cười với bạn!");

speakBtn.onclick = () => speak("Xin chào, tôi là ThamAI!");

listenBtn.onclick = () => startListening();

muteBtn.onclick = () => {
  isMuted = !isMuted;
  muteBtn.textContent = isMuted ? "🔇" : "🔈";
};

darkModeBtn.onclick = () => {
  document.body.classList.toggle("dark-mode");
};

clearBtn.onclick = () => {
  chatbox.innerHTML = "";
};

saveBtn.onclick = () => {
  localStorage.setItem("chatHistory", chatbox.innerHTML);
  addMessage("bot", "💾 Đã lưu hội thoại!");
};

loadBtn.onclick = () => {
  chatbox.innerHTML = localStorage.getItem("chatHistory") || "";
  addMessage("bot", "📂 Đã nạp hội thoại!");
};

downloadBtn.onclick = () => {
  const text = chatbox.innerText;
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "chat.txt";
  a.click();
};

debugBtn.onclick = () => {
  debugPanel.style.display =
    debugPanel.style.display === "none" ? "block" : "none";
};

/* ========== DEBUG HELPER ========== */
function logDebug(msg) {
  const p = document.createElement("div");
  p.textContent = msg;
  debugPanel.appendChild(p);
  debugPanel.scrollTop = debugPanel.scrollHeight;
}

/* ========== INIT ========== */
addMessage("bot", "🤖 Xin chào! Tôi là ThamAI, bạn muốn nói gì nào?");
