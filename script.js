// Hàm cho bot đọc thành tiếng (TTS)
function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";  // ngôn ngữ tiếng Việt
    utterance.rate = 1;        // tốc độ đọc (0.1 - 10)
    utterance.pitch = 1;       // cao độ giọng (0 - 2)
    speechSynthesis.speak(utterance);
}

// Hàm hiển thị tin nhắn lên chatbox
function displayMessage(message, sender) {
    const chatbox = document.getElementById("chatbox");
    const msgDiv = document.createElement("div");
    msgDiv.className = sender; // "user" hoặc "bot"
    msgDiv.textContent = message;
    chatbox.appendChild(msgDiv);

    // Nếu bot trả lời thì đọc thành tiếng
    if (sender === "bot") {
        speak(message);
    }

    // Tự động cuộn xuống cuối
    chatbox.scrollTop = chatbox.scrollHeight;
}

// Gửi tin nhắn text tới backend
async function sendMessage() {
    const input = document.getElementById("userInput");
    const message = input.value.trim();
    if (!message) return;

    displayMessage(message, "user");
    input.value = "";

    try {
        const response = await fetch("http://127.0.0.1:5000/chat", { // thay URL backend nếu deploy
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message })
        });

        const data = await response.json();
        displayMessage(data.reply, "bot");

    } catch (error) {
        displayMessage("❌ Lỗi kết nối server!", "bot");
    }
}

// Nhấn nút gửi ➤
document.getElementById("sendBtn").addEventListener("click", sendMessage);

// Gõ Enter để gửi
document.getElementById("userInput").addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        sendMessage();
    }
});

// Nhận diện giọng nói (Speech Recognition)
let recognition;
if ("webkitSpeechRecognition" in window) {
    recognition = new webkitSpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById("userInput").value = transcript;
        sendMessage();
    };

    recognition.onerror = function(event) {
        displayMessage("❌ Lỗi micro: " + event.error, "bot");
    };
} else {
    alert("Trình duyệt của bạn không hỗ trợ Speech Recognition!");
}

// Nút 🎤 để bắt đầu nghe
document.getElementById("micBtn").addEventListener("click", function() {
    if (recognition) recognition.start();
});
