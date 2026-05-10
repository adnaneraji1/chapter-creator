import threading
import webview
from server import app

def run_flask():
    app.run(host="127.0.0.1", port=5000, debug=False, use_reloader=False)

if __name__ == "__main__":
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()

    window = webview.create_window(
    title="Chapter Creator",
    url="http://127.0.0.1:5000",
    maximized=True
)

    webview.start()