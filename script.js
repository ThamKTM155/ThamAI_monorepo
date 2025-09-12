let debugMode = false;

// Thêm log vào panel hoặc console
function debugLog(...args) {
    if (debugMode) {
        const panel = document.getElementById("debugPanel");
        const msg = args.map(a => (typeof a === "object" ? JSON.stringify(a) : a)).join(" ");
        panel.innerHTML += `<div>> ${msg}</div>`;
        panel.scrollTop = panel.scrollHeight;
    }
    console.log(...args);
}

// Gửi tin nhắn tới backend
async function sendMessage(message) {
    if (!message.trim()) return;

    appendMessage("user", message);

    try {
        const response = await fetch("https://thamai-monorepo-backend.onrender.com/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            debugLog(`❌ Backend HTTP error: ${response.status} ${response.statusText}`);
            appendMessage("bot", `⚠️ Lỗi backend: ${response.statusText} (mã ${response.status})`);
            return;
        }

        const data = await response.json();

        if (data.error) {
            debugLog("🔥 Backend error:", data.error);
            appendMessage("bot", `⚠️ Lỗi từ backend: ${data.error}`);
            return;
        }

        appendMessage("bot", data.reply);

    } catch (err) {
        debugLog("💥 Fetch failed:", err);
        appendMessage("bot", "⚠️ Không kết nối được với server.");
    }
}

// Thêm tin nhắn với avatar
function appendMessage(sender, text) {
    const chatbox = document.getElementById("chatbox");
    const messageEl = document.createElement("div");
    messageEl.classList.add("message", sender);

    const avatar = document.createElement("img");
    avatar.src = sender === "user" ? "user.png" : "bot.png";
    avatar.classList.add("avatar");

    const bubble = document.createElement("div");
    bubble.classList.add("bubble");
    bubble.textContent = text;

    messageEl.appendChild(avatar);
    messageEl.appendChild(bubble);
    chatbox.appendChild(messageEl);
    chatbox.scrollTop = chatbox.scrollHeight;
}

// Sự kiện gửi tin nhắn
document.getElementById("sendBtn").addEventListener("click", () => {
    const input = document.getElementById("userInput");
    sendMessage(input.value);
    input.value = "";
});

document.getElementById("userInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        const input = document.getElementById("userInput");
        sendMessage(input.value);
        input.value = "";
    }
});

// Sự kiện bật/tắt Debug
document.getElementById("debugBtn").addEventListener("click", () => {
    debugMode = !debugMode;
    const panel = document.getElementById("debugPanel");
    panel.style.display = debugMode ? "block" : "none";
    if (debugMode) {
        debugLog("🐞 Debug mode enabled");
    } else {
        console.clear();
    }
});
