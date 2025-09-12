const chatbox = document.getElementById("chatbox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const voiceSelect = document.getElementById("voiceSelect");
const darkModeBtn = document.getElementById("darkModeBtn");

let voices = [];

// Load voices
function populateVoices() {
  voices = speechSynthesis.getVoices();
  voiceSelect.innerHTML = "";
  voices.forEach((v, i) => {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `${v.name} (${v.lang})`;
    voiceSelect.appendChild(option);
  });
}
speechSynthesis.onvoiceschanged = populateVoices;

// Append message
function appendMessage(text, sender = "bot") {
  const message = document.createElement("div");
  message.classList.add("message", sender);

  const avatar = document.createElement("img");
  avatar.classList.add("avatar");
  avatar.src = sender === "user"
    ? "https://i.ibb.co/Y8m6VYj/user.png"
    : "https://i.ibb.co/3FqVzMT/bot.png";

  const bubble = document.createElement("div");
  bubble.classList.add("bubble");
  bubble.textContent = text;

  if (sender === "user") {
    message.appendChild(bubble);
    message.appendChild(avatar);
  } else {
    message.appendChild(avatar);
    message.appendChild(bubble);
  }

  chatbox.appendChild(message);
  chatbox.scrollTop = chatbox.scrollHeight;
}

// Send message
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;
  appendMessage(text, "user");
  userInput.value = "";

  try {
    const response = await fetch("https://thamai-backend-clean-1-h88m.onrender.com/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });
    const data = await response.json();
    const reply = data.reply || "Xin lỗi, tôi chưa có phản hồi.";
    appendMessage(reply, "bot");
    speak(reply);
  } catch (err) {
    console.error(err);
    appendMessage("❌ Lỗi kết nối server!", "bot");
  }
}

// Text-to-Speech
function speak(text) {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  const selected = voiceSelect.value;
  if (voices[selected]) utterance.voice = voices[selected];
  speechSynthesis.speak(utterance);
}

// Speech-to-Text
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = "vi-VN";
  recognition.interimResults = false;

  micBtn.addEventListener("click", () => {
    if (micBtn.classList.contains("listening")) {
      recognition.stop();
      micBtn.classList.remove("listening");
    } else {
      recognition.start();
      micBtn.classList.add("listening");
    }
  });

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    userInput.value = transcript;
    sendMessage();
  };

  recognition.onend = () => {
    micBtn.classList.remove("listening");
  };
}

// Events
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
darkModeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});
