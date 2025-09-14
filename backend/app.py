
import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import openai

# ----------------------------
# Logging setup
# ----------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),                     # log ra console
        logging.FileHandler("app.log", encoding="utf-8")  # log ra file
    ]
)

logger = logging.getLogger(__name__)

# ----------------------------
# Flask setup
# ----------------------------
app = Flask(__name__)

# Cho phép tất cả origin (hoặc whitelist nếu muốn an toàn hơn)
CORS(app, resources={r"/*": {"origins": "*"}})

# ----------------------------
# OpenAI setup
# ----------------------------
openai.api_key = os.getenv("OPENAI_API_KEY")

# ----------------------------
# Routes
# thêm import logging nếu chưa có
import logging

# --- ở phần routes, thêm ---
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "ThamAI Backend",
        "openai_key_set": bool(openai.api_key),
    })

# ----------------------------
@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "ok", "message": "ThamAI Backend is running!"})

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        if not data or "message" not in data:
            logger.warning("⚠️ Missing 'message' in request body")
            return jsonify({"error": "Missing 'message' in request body"}), 400

        user_message = data["message"]
        logger.info(f"📩 User message: {user_message}")

        if not openai.api_key:
            logger.error("❌ OPENAI_API_KEY not set in environment")
            return jsonify({"error": "Server misconfiguration: OPENAI_API_KEY missing"}), 500

        # Gọi OpenAI ChatCompletion
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",   # có thể đổi thành gpt-4
            messages=[
                {"role": "system", "content": "Bạn là trợ lý AI tên ThamAI, trả lời ngắn gọn, rõ ràng."},
                {"role": "user", "content": user_message}
            ],
            max_tokens=300,
            temperature=0.7,
        )

        bot_reply = response["choices"][0]["message"]["content"].strip()
        logger.info(f"🤖 Bot reply: {bot_reply}")

        return jsonify({"reply": bot_reply})

    except Exception as e:
        logger.exception("🔥 Error in /chat endpoint")
        return jsonify({"error": str(e)}), 500


# ----------------------------
# Main
# ----------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
