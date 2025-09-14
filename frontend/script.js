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

let recognition;
let synth = window.speechSynthesis;
let voices = [];
let isMuted = false;

// ========== Chat UI ==========
function addMessage(sender, text) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${sender}`;
  msgDiv.innerHTML = `<div class="bubble">${text}</div>`;
  chatbox.appendChild(msgDiv);
  chatbox.scrollTop = chatbox.scrollHeight;
}

// ========== Speech ==========
function populateVoices() {
  voices = synth.getVoices();
  voiceSelect.innerHTML = "";
  voices.forEach((voice, i) => {
    let option = document.createElement("option");
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

// ========== Recognition ==========
if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = "vi-VN";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    addMessage("user", text);
    botReply("Bạn vừa nói: " + text);
  };

  recognition.onerror = (event) => {
    logDebug("Lỗi mic: " + event.error);
  };
}

function startListening() {
  if (recognition) recognition.start();
}

// ========== Bot Logic ==========
function botReply(msg) {
  addMessage("bot", msg);
  speak(msg);
}

// ========== Event Handlers ==========
sendBtn.onclick = () => {
  const text = userInput.value.trim();
  if (!text) return;
  addMessage("user", text);
  userInput.value = "";
  botReply("ThamAI trả lời: " + text);
};

micBtn.onclick = () => startListening();

smileBtn.onclick = () => botReply("😊 Tôi đang cười với bạn!");

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
  botReply("💾 Đã lưu hội thoại!");
};

loadBtn.onclick = () => {
  chatbox.innerHTML = localStorage.getItem("chatHistory") || "";
  botReply("📂 Đã nạp hội thoại!");
};

downloadBtn.onclick = () => {
  let text = chatbox.innerText;
  let blob = new Blob([text], { type: "text/plain" });
  let url = URL.createObjectURL(blob);
  let a = document.createElement("a");
  a.href = url;
  a.download = "chat.txt";
  a.click();
};

debugBtn.onclick = () => {
  debugPanel.style.display =
    debugPanel.style.display === "none" ? "block" : "none";
};

function logDebug(msg) {
  const p = document.createElement("div");
  p.textContent = msg;
  debugPanel.appendChild(p);
  debugPanel.scrollTop = debugPanel.scrollHeight;
}
