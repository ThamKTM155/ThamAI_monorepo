// Lấy API endpoint từ index.html
const API_CHAT = window.API_CHAT || "";
const API_BASE = "https://thamai-monorepo-backend-1.onrender.com";
// Các phần tử DOM
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const laughBtn = document.getElementById("laugh-btn");
const speakBtn = document.getElementById("speak-btn");
const listenBtn = document.getElementById("listen-btn");
const clearBtn = document.getElementById("clear-btn");
const saveBtn = document.getElementById("save-btn");

// Thêm tin nhắn vào khung chat
function addMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.innerText = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Gửi tin nhắn tới backend
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage("user", text);
  userInput.value = "";

  try {
    const response = await fetch(API_CHAT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    const data = await response.json();
    if (data && data.reply) {
      addMessage("bot", data.reply);
      speakText(data.reply);
    } else {
      addMessage("bot", "⚠️ Không nhận được phản hồi từ server.");
    }
  } catch (err) {
    addMessage("bot", "❌ Lỗi kết nối tới server.");
    console.error(err);
  }
}

// Đọc văn bản bằng giọng nói
function speakText(text) {
  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(text);
  const voiceSelect = document.getElementById("voice").value;

  const voices = synth.getVoices();
  if (voices.length > 0) {
    utter.voice = voices.find(v =>
      voiceSelect === "male" ? v.name.includes("Male") : v.name.includes("Female")
    ) || voices[0];
  }

  synth.speak(utter);
}

// Nhận giọng nói thành văn bản
function startListening() {
  if (!("webkitSpeechRecognition" in window)) {
    alert("⚠️ Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói.");
    return;
  }
  const recognition = new webkitSpeechRecognition();
  recognition.lang = "vi-VN";
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    userInput.value = transcript;
    sendMessage();
  };
  recognition.start();
}

// Gán sự kiện cho nút
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

laughBtn.addEventListener("click", () => addMessage("bot", "😂 Ha ha ha!"));
speakBtn.addEventListener("click", () => speakText("Xin chào, tôi là Tham AI _monorepo!"));
listenBtn.addEventListener("click", startListening);
clearBtn.addEventListener("click", () => chatBox.innerHTML = "");
saveBtn.addEventListener("click", () => {
  const text = chatBox.innerText;
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "chat_history.txt";
  a.click();
});
