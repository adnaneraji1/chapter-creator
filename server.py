from flask import Flask, request, jsonify, send_from_directory
import os
import sys
import json
import hashlib
from datetime import datetime

def app_base_path():
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.abspath(".")

BASE_PATH = app_base_path()
UI_DIR = os.path.join(BASE_PATH, "ui")
CONFIG_FILE = os.path.join(BASE_PATH, "config.json")
ACTIVITY_FILE = os.path.join(BASE_PATH, "recent_activity.json")

app = Flask(__name__)

def read_config():
    if not os.path.exists(CONFIG_FILE):
        return {"base_dir": ""}

    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"base_dir": ""}

def write_config(data):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def get_base_dir():
    return read_config().get("base_dir", "")

def ensure_activity_file():
    if not os.path.exists(ACTIVITY_FILE):
        with open(ACTIVITY_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=2)

def read_activity():
    ensure_activity_file()
    try:
        with open(ACTIVITY_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except Exception:
        return []

def write_activity(data):
    with open(ACTIVITY_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@app.after_request
def no_cache(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.route("/")
def home():
    return send_from_directory(UI_DIR, "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(UI_DIR, path)

@app.route("/config")
def config():
    base_dir = get_base_dir()
    return jsonify({
        "base_dir": base_dir,
        "configured": bool(base_dir and os.path.isdir(base_dir))
    })

@app.route("/set_base_dir", methods=["POST"])
def set_base_dir():
    data = request.json or {}
    base_dir = str(data.get("base_dir", "")).strip().strip('"')

    if not base_dir:
        return jsonify({"error": "Folder path is required"}), 400

    if not os.path.isdir(base_dir):
        return jsonify({"error": "Folder does not exist"}), 400

    write_config({"base_dir": base_dir})
    return jsonify({"success": True, "base_dir": base_dir})

@app.route("/ui_status")
def ui_status():
    files = ["index.html", "style.css", "app.js"]
    hasher = hashlib.md5()

    for filename in files:
        full_path = os.path.join(UI_DIR, filename)
        if os.path.exists(full_path):
            with open(full_path, "rb") as f:
                hasher.update(f.read())

    return jsonify({"version": hasher.hexdigest()})

@app.route("/get_works")
def get_works():
    base_dir = get_base_dir()

    if not base_dir or not os.path.isdir(base_dir):
        return jsonify({"error": "Base folder is not configured"}), 400

    ignore = {"chapter-app", "watermark", "ui", "dist", "build", "__pycache__"}
    works = []

    for f in os.listdir(base_dir):
        path = os.path.join(base_dir, f)
        if os.path.isdir(path) and f not in ignore:
            works.append(f)

    works.sort()
    return jsonify(works)

@app.route("/recent")
def recent():
    return jsonify(read_activity()[:20])

@app.route("/delete_activity", methods=["POST"])
def delete_activity():
    data = request.json or {}
    path_to_delete = str(data.get("path", "")).strip()

    activity = read_activity()
    activity = [item for item in activity if item.get("path") != path_to_delete]
    write_activity(activity)

    return jsonify({"success": True})

@app.route("/open_folder", methods=["POST"])
def open_folder():
    data = request.json or {}
    folder_path = str(data.get("path", "")).strip()

    if not folder_path:
        return jsonify({"error": "Path is required"}), 400

    if not os.path.exists(folder_path):
        return jsonify({"error": "Folder does not exist"}), 404

    os.startfile(folder_path)
    return jsonify({"success": True})

@app.route("/create", methods=["POST"])
def create():
    base_dir = get_base_dir()

    if not base_dir or not os.path.isdir(base_dir):
        return jsonify({"error": "Base folder is not configured"}), 400

    data = request.json or {}

    chapter = str(data.get("chapter", "")).strip()
    mode = str(data.get("mode", "")).strip()
    work = str(data.get("work", "")).strip()

    if not chapter.isdigit():
        return jsonify({"error": "Chapter must be a number"}), 400

    num = int(chapter)

    if num < 0 or num > 999:
        return jsonify({"error": "Chapter must be between 0 and 999"}), 400

    chapter = str(num)

    if not work:
        return jsonify({"error": "Work name is required"}), 400

    if mode == "new":
        work = "-".join(work.split())

    work_path = os.path.join(base_dir, work)

    if not os.path.exists(work_path):
        os.makedirs(work_path)

    chapter_path = os.path.join(work_path, chapter)

    if os.path.exists(chapter_path):
        return jsonify({"error": "Chapter already exists"}), 400

    os.makedirs(os.path.join(chapter_path, "الفصل"))
    os.makedirs(os.path.join(chapter_path, "التحرير"))
    os.makedirs(os.path.join(chapter_path, "التسليم"))

    activity = read_activity()
    activity.insert(0, {
        "work": work,
        "chapter": chapter,
        "mode": "New Work" if mode == "new" else "Existing Work",
        "path": chapter_path,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })
    write_activity(activity[:50])

    return jsonify({"success": chapter_path})

if __name__ == "__main__":
    ensure_activity_file()
    app.run(host="127.0.0.1", port=5000, debug=False)