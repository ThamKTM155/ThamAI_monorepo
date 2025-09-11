// ====== Cấu hình ======
const API_BASE = "https://thamai-monorepo-backend.onrender.com"; // backend Render

const chatbox = document.getElementById("chatbox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");

// ====== Hàm thêm tin nhắn vào khung chat ======
function addMessage(sender, text) {
    const msg = document.createElement("div");
    msg.className = sender;
    msg.textContent = text;
    chatbox.appendChild(msg);
    chatbox.scrollTop = chatbox.scrollHeight;
}

// ====== Gửi tin nhắn văn bản ======
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    addMessage("user", "🧑 " + text);
    userInput.value = "";

    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text })
        });

        if (!response.ok) throw new Error("Lỗi API chat");

        const data = await response.json();
        const replyText = data.reply || "Xin lỗi, tôi không hiểu.";

        addMessage("bot", "🤖 " + replyText);

        // Phát âm thanh trả lời
        const audioResponse = await fetch(`${API_BASE}/tts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: replyText })
        });

        if (audioResponse.ok) {
            const audioBlob = await audioResponse.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.play().catch(err => console.error("Không phát được audio:", err));
        } else {
            console.warn("Backend không trả về audio hợp lệ.");
        }

    } catch (err) {
        console.error("Lỗi:", err);
        addMessage("bot", "⚠️ Lỗi kết nối tới server.");
    }
}

// ====== Gửi tin nhắn khi bấm nút ======
sendBtn.addEventListener("click", sendMessage);

// ====== Gửi tin nhắn khi nhấn Enter ======
userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault(); // chặn xuống dòng
        sendMessage();
    }
});

// ====== Nhận diện giọng nói ======
let recognition;
if ("webkitSpeechRecognition" in window) {
    recognition = new webkitSpeechRecognition();
    recognition.lang = "vi-VN"; // hỗ trợ tiếng Việt
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        micBtn.classList.add("listening"); // đổi màu khi đang nghe
    };

    recognition.onend = () => {
        micBtn.classList.remove("listening");
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        sendMessage();
    };
} else {
    console.warn("Trình duyệt không hỗ trợ SpeechRecognition.");
}

micBtn.addEventListener("click", () => {
    if (recognition) recognition.start();
});
