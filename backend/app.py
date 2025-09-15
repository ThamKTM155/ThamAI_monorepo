import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import openai

app = Flask(__name__)
CORS(app)

# Lấy API key từ biến môi trường
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_PROJECT_ID = os.getenv("OPENAI_PROJECT_ID")  # chỉ cần nếu dùng sk-proj

if not OPENAI_API_KEY:
    raise ValueError("❌ Chưa có OPENAI_API_KEY trong biến môi trường!")

openai.api_key = OPENAI_API_KEY

@app.route("/")
def home():
    return "✅ ThamAI_monorepo backend is running!"

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        user_message = data.get("message", "").strip()

        if not user_message:
            return jsonify({"error": "⚠️ Message trống"}), 400

        # Kiểm tra loại API key
        is_project_key = OPENAI_API_KEY.startswith("sk-proj-")

        params = {
            "model": "gpt-4o-mini",  # nhẹ và nhanh
            "messages": [
                {"role": "system", "content": "Bạn là trợ lý AI tên ThamAI, giúp đỡ người dùng."},
                {"role": "user", "content": user_message}
            ],
            "temperature": 0.7
        }

        # Nếu là project key thì truyền thêm project ID
        if is_project_key:
            if not OPENAI_PROJECT_ID:
                return jsonify({"error": "⚠️ Dùng sk-proj cần thêm OPENAI_PROJECT_ID"}), 400
            response = openai.ChatCompletion.create(**params, project=OPENAI_PROJECT_ID)
        else:
            response = openai.ChatCompletion.create(**params)

        reply = response["choices"][0]["message"]["content"].strip()
        return jsonify({"reply": reply})

    except Exception as e:
        return jsonify({"error": f"🔥 Error in /chat endpoint: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
