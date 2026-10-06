# app.py
import os
import sys
import json
import asyncio
import threading
import requests
from typing import Optional, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ai_engine import AIEngine
from watcher import FileQueueManager, MultiPathWatcher
from ai_decide import ai_decide_engine
from activity_tracker import activity_tracker
from crud_engine import (
    list_directory, create_folder, rename_item, move_item,
    delete_item, open_in_windows_explorer, get_drives_info, get_storage_details
)
from agent_engine import AutonomousAgent
from content_extractor import get_file_metadata, extract_content

SRC_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SRC_DIR)
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Priority: config/config.json -> config.json
CONFIG_PATH = os.path.join(PROJECT_ROOT, 'config', 'config.json')
if not os.path.exists(CONFIG_PATH):
    fallback_config = os.path.join(PROJECT_ROOT, 'config.json')
    if os.path.exists(fallback_config):
        CONFIG_PATH = fallback_config

app = FastAPI(title="AI File Manager & Organizer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket Connections manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for conn in list(self.active_connections):
            try:
                await conn.send_json(message)
            except Exception:
                pass

ws_manager = ConnectionManager()
main_loop = None

def broadcast_sync(message: dict):
    """Thread-safe WebSocket broadcaster callable from sync functions and engines."""
    global main_loop
    loop = main_loop
    if not loop:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = None
    if loop and loop.is_running():
        try:
            asyncio.run_coroutine_threadsafe(ws_manager.broadcast(message), loop)
            return
        except Exception:
            pass
    try:
        threading.Thread(target=lambda: asyncio.run(ws_manager.broadcast(message)), daemon=True).start()
    except Exception:
        pass

# Initialize engines with real-time WebSocket broadcaster
ai_engine = AIEngine(CONFIG_PATH, broadcaster=broadcast_sync)
queue_mgr = FileQueueManager(ai_engine)
agent_runner = AutonomousAgent(ai_engine, broadcaster=broadcast_sync)

# Watcher initialization
config = ai_engine.config
watch_paths = config.get('watch_paths', [r'D:\DOWNLOAD', r'C:\Users\fadhl\OneDrive\Documents'])
watcher = MultiPathWatcher(queue_mgr, watch_paths)

def on_queue_event(event_type, item):
    loop = None
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        pass
    if loop and loop.is_running():
        asyncio.run_coroutine_threadsafe(
            ws_manager.broadcast({"type": event_type, "item": item}), loop
        )

queue_mgr.add_listener(on_queue_event)

def _deferred_initial_scan():
    """Background scan that starts 2s after server is ready - keeps startup instant."""
    import time as _time
    _time.sleep(2.0)
    for p in watch_paths:
        try:
            if os.path.exists(p):
                for f in os.listdir(p):
                    fp = os.path.join(p, f)
                    if os.path.isfile(fp) and not f.startswith('.'):
                        queue_mgr.add_to_queue(fp)
        except Exception as e:
            print(f'[Startup Scan] Error scanning {p}: {e}')

@app.on_event("startup")
def startup_event():
    global main_loop
    try:
        main_loop = asyncio.get_running_loop()
    except Exception:
        try:
            main_loop = asyncio.get_event_loop()
        except Exception:
            pass
    watcher.start()
    # Server responds instantly; scan happens in background after 2s
    threading.Thread(target=_deferred_initial_scan, daemon=True).start()

@app.on_event("shutdown")
def shutdown_event():
    watcher.stop()

# ----------------- REST Endpoints -----------------


# ----------------- AI Decide & Real Telemetry Endpoints -----------------

@app.get("/api/stats/overview")
def get_stats_overview():
    """Returns real telemetry data starting from 0 today."""
    summary = activity_tracker.get_summary()
    queue = queue_mgr.get_queue()
    drives = get_drives_info()
    d_drive = next((d for d in drives if d['letter'] == 'D'), None)
    return {
        "status": "success",
        "data": {
            **summary,
            "queue_count": len(queue),
            "storage_free_gb": d_drive['free_gb'] if d_drive else 0,
            "storage_used_gb": d_drive['used_gb'] if d_drive else 0,
            "storage_percent": d_drive['percent_used'] if d_drive else 0,
        }
    }

class SafetyCheckRequest(BaseModel):
    path: str
    action: Optional[str] = 'MOVE'

@app.post("/api/ai-decide/evaluate")
def api_ai_decide_evaluate(req: SafetyCheckRequest):
    """Dynamic contextual AI Decide evaluator."""
    safety = ai_decide_engine.evaluate(req.path, req.action)
    return {"status": "success", "safety": safety}

@app.get("/api/status")
def get_status():
    drives = get_drives_info()
    prov_info = ai_engine.get_provider_details()
    queue = queue_mgr.get_queue()
    return {
        "status": "online",
        "drives": drives,
        "provider": prov_info,
        "queue_count": len(queue),
        "watch_paths": watcher.paths
    }

@app.get("/api/browse")
def browse(path: str = Query("D:\\")):
    res = list_directory(path)
    return res

@app.get("/api/tree")
def get_tree(path: str = Query("D:\\")):
    # Return 1-level deep subdirectories for tree building
    if not os.path.exists(path):
        return []
    nodes = []
    try:
        with os.scandir(path) as entries:
            for e in entries:
                if e.is_dir(follow_symlinks=False) and not e.name.startswith('$') and not e.name.startswith('.'):
                    nodes.append({
                        "name": e.name,
                        "path": e.path,
                        "has_children": True
                    })
    except Exception:
        pass
    nodes.sort(key=lambda x: x["name"].lower())
    return nodes

@app.get("/api/queue")
def get_queue():
    return queue_mgr.get_queue()

@app.post("/api/queue/scan")
@app.post("/api/queue/scan-now")
def scan_now():
    count_before = len(queue_mgr.get_queue())
    for p in watcher.paths:
        if os.path.exists(p):
            for f in os.listdir(p):
                fp = os.path.join(p, f)
                if os.path.isfile(fp) and not f.startswith('.'):
                    queue_mgr.add_to_queue(fp)
    count_after = len(queue_mgr.get_queue())
    return {"scanned": True, "new_items": count_after - count_before, "total_queue": count_after}

class AnalyzeQueueRequest(BaseModel):
    item_id: Optional[str] = None

@app.post("/api/queue/analyze")
def analyze_queue(req: Optional[AnalyzeQueueRequest] = None):
    item_id = req.item_id if req else None
    queue = queue_mgr.get_queue()
    if item_id:
        items = [x for x in queue if x['id'] == item_id]
    else:
        items = queue

    results = []
    for it in items:
        src = it['path']
        clf = it.get('classification')
        if not clf or not clf.get('target_folder'):
            clf = ai_engine.classify_file(src) or {}
            it['classification'] = clf
            
        safety = it.get('safety') or ai_decide_engine.evaluate(src)
        it['safety'] = safety

        target_folder = clf.get('target_folder')
        if not target_folder:
            ext = os.path.splitext(src)[1].lower()
            if ext in ['.docx', '.pdf', '.pptx', '.xlsx']:
                target_folder = os.path.join(r"D:\Kuliah", "Umum")
            else:
                target_folder = os.path.join(r"D:\\fadhl", "Arsip")

        suggested_name = clf.get('suggested_name') or it['name']
        dest_path = os.path.join(target_folder, suggested_name)

        results.append({
            "id": it['id'],
            "name": it['name'],
            "size": it.get('size', 0),
            "source_path": src,
            "target_folder": target_folder,
            "suggested_name": suggested_name,
            "destination_path": dest_path,
            "category": clf.get('category', 'Dokumen'),
            "course": clf.get('course', ''),
            "summary": clf.get('summary', 'Klasifikasi Dokumen'),
            "confidence": clf.get('confidence', 0.95),
            "is_draft": clf.get('is_draft', False),
            "safety": safety
        })

    return {
        "success": True,
        "items": results,
        "count": len(results)
    }

class ConfirmedQueueItem(BaseModel):
    id: str
    source_path: Optional[str] = None
    target_folder: Optional[str] = None
    target_name: Optional[str] = None
    force: Optional[bool] = True

class ExecuteQueueRequest(BaseModel):
    items: Optional[List[ConfirmedQueueItem]] = None
    item_id: Optional[str] = None
    custom_target_folder: Optional[str] = None
    custom_name: Optional[str] = None
    force: Optional[bool] = False

@app.post("/api/queue/execute-confirmed")
@app.post("/api/queue/execute-all")
@app.post("/api/queue/execute")
def execute_queue(req: Optional[ExecuteQueueRequest] = None):
    queue = queue_mgr.get_queue()
    results = []
    
    if req and req.items and len(req.items) > 0:
        for conf_it in req.items:
            matching = next((x for x in queue if x['id'] == conf_it.id), None)
            src = conf_it.source_path or (matching['path'] if matching else None)
            if not src or not os.path.exists(src):
                results.append({"id": conf_it.id, "status": "error", "error": f"Berkas tidak ditemukan: {src}"})
                continue
            
            clf = (matching.get('classification') if matching else None) or ai_engine.classify_file(src)
            dst_folder = conf_it.target_folder or (clf.get('target_folder') if clf else None) or r"D:\Kuliah"
            dst_name = conf_it.target_name or (clf.get('suggested_name') if clf else None) or os.path.basename(src)
            force_flag = conf_it.force if conf_it.force is not None else req.force

            res = move_item(src, dst_folder, dst_name, force=force_flag)
            if res.get('success'):
                queue_mgr.mark_completed(conf_it.id)
                results.append({
                    "id": conf_it.id,
                    "status": "moved",
                    "src": src,
                    "dest": res.get('dst_path') or res.get('new_path'),
                    "target_folder": dst_folder
                })
            else:
                results.append({
                    "id": conf_it.id,
                    "status": "error",
                    "error": res.get('error') or "Gagal memindahkan berkas"
                })
    else:
        req_item_id = req.item_id if req else None
        req_custom_folder = req.custom_target_folder if req else None
        req_custom_name = req.custom_name if req else None
        force_flag = req.force if req else False

        if req_item_id:
            items_to_process = [x for x in queue if x['id'] == req_item_id]
        else:
            items_to_process = queue

        for it in items_to_process:
            src = it['path']
            clf = it.get('classification') or ai_engine.classify_file(src)
            dst_folder = req_custom_folder or (clf.get('target_folder') if clf else None) or r"D:\Kuliah"
            dst_name = req_custom_name or (clf.get('suggested_name') if clf else None) or it['name']

            res = move_item(src, dst_folder, dst_name, force=force_flag)
            if res.get('success'):
                queue_mgr.mark_completed(it['id'])
                results.append({
                    "id": it['id'],
                    "status": "moved",
                    "src": src,
                    "dest": res.get('dst_path') or res.get('new_path'),
                    "target_folder": dst_folder
                })
            else:
                results.append({
                    "id": it['id'],
                    "status": "error",
                    "error": res.get('error') or "Gagal memindahkan berkas"
                })

    moved_count = sum(1 for r in results if r.get('status') == 'moved')
    return {
        "success": True,
        "processed": len(results),
        "moved_count": moved_count,
        "failed_count": len(results) - moved_count,
        "details": results
    }

class DismissRequest(BaseModel):
    item_id: str

@app.post("/api/queue/dismiss")
def dismiss_queue(req: DismissRequest):
    success = queue_mgr.dismiss_item(req.item_id)
    return {"success": success}

@app.get("/api/file/preview")
def file_preview(path: str = Query(...)):
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File tidak ditemukan")
    meta = get_file_metadata(path)
    content = extract_content(path, max_chars=3000)
    classification = ai_engine.classify_file(path)
    return {
        "metadata": meta,
        "content_preview": content,
        "classification": classification
    }

class CreateFolderRequest(BaseModel):
    parent_path: str
    folder_name: str

@app.post("/api/crud/create-folder")
def api_create_folder(req: CreateFolderRequest):
    return create_folder(req.parent_path, req.folder_name)

class RenameRequest(BaseModel):
    path: str
    new_name: str

@app.post("/api/crud/rename")
def api_rename(req: RenameRequest):
    return rename_item(req.path, req.new_name)

class MoveRequest(BaseModel):
    src: str
    dst_dir: str
    new_name: Optional[str] = None
    force: Optional[bool] = False

@app.post("/api/crud/move")
def api_move(req: MoveRequest):
    return move_item(req.src, req.dst_dir, req.new_name, force=req.force)

class DeleteRequest(BaseModel):
    path: str
    force: Optional[bool] = False

@app.post("/api/crud/delete")
def api_delete(req: DeleteRequest):
    return delete_item(req.path, force=req.force)

class OpenExplorerRequest(BaseModel):
    path: str

@app.post("/api/crud/open-explorer")
def api_open_explorer(req: OpenExplorerRequest):
    return open_in_windows_explorer(req.path)

class OpenFileRequest(BaseModel):
    path: str

@app.post("/api/crud/open-file")
def api_open_file(req: OpenFileRequest):
    """Opens target file directly in default Windows application (e.g. Acrobat Reader, Word, Excel)."""
    target = req.path.strip()
    if not os.path.exists(target):
        return {"success": False, "error": f"Berkas tidak ditemukan: {target}"}
    try:
        os.startfile(target)
        return {"success": True, "message": "Berkas dibuka dengan aplikasi bawaan Windows."}
    except Exception as e:
        return {"success": False, "error": str(e)}

class ChatRequest(BaseModel):
    message: str
    current_path: str = "D:\\"
    mentioned_items: Optional[List[str]] = []
    model_override: Optional[str] = None
    provider_override: Optional[str] = None
    history: Optional[List[dict]] = []

@app.post("/api/ai/chat")
def api_chat(req: ChatRequest):
    res = agent_runner.run(
        user_prompt=req.message,
        current_path=req.current_path,
        mentioned_items=req.mentioned_items,
        model_override=req.model_override,
        provider_override=req.provider_override,
        history=req.history
    )
    return res

class ActionExecuteRequest(BaseModel):
    command: str

@app.post("/api/action/execute")
def api_action_execute(req: ActionExecuteRequest):
    """Executes verified action (PowerShell command or confirmed file deletion) from semantic chat button."""
    import re
    cmd = req.command.strip()
    if not cmd:
        return {"success": False, "error": "Command is empty"}

    cmd_lower = cmd.lower()
    # If the user clicked a confirmed deletion command (Remove-Item / del)
    if any(k in cmd_lower for k in ['remove-item', 'del ', 'rmdir ', 'erase ']):
        match = re.search(r"""-(?:LiteralPath|Path)?\s*['"]([^'"]+)['"]""", cmd, re.IGNORECASE)
        target_path = match.group(1) if match else None
        if not target_path:
            match_raw = re.search(r"""['"]([a-zA-Z]:\[^'"]+)['"]""", cmd)
            if match_raw:
                target_path = match_raw.group(1)
        if not target_path:
            match_unquoted = re.search(r"(?:remove-item|del|rmdir)\s+([a-zA-Z]:\[^\s]+)", cmd, re.IGNORECASE)
            if match_unquoted:
                target_path = match_unquoted.group(1)

        if target_path:
            if not os.path.exists(target_path):
                return {"success": True, "output": f"Berkas '{target_path}' sudah tidak ada."}
            del_res = delete_item(target_path, force=True)
            if del_res.get('success'):
                return {"success": True, "output": f"Berkas '{target_path}' berhasil dipindahkan ke Recycle Bin."}
            else:
                return {"success": False, "error": del_res.get('error', 'Gagal menghapus berkas.')}

    # Standard execution for non-delete commands
    res = agent_runner.toolbox.powershell_exec(cmd)
    if res.startswith("Error:") or res.startswith("BLOCKED BY") or res.startswith("[PowerShell Error"):
        return {"success": False, "error": res}
    return {"success": True, "output": res}

@app.get("/api/storage/details")
def api_storage_details():
    return get_storage_details()

class SettingsUpdateRequest(BaseModel):
    active_provider: str
    providers: dict
    watch_paths: List[str]
    academic_base: Optional[str] = "D:\\Kuliah"
    personal_base: Optional[str] = "D:\\fadhl"
    project_base: Optional[str] = "D:\\PROJECT"
    game_base: Optional[str] = "D:\\Game"
    custom_models: Optional[List[str]] = []
    models_registry: Optional[List[dict]] = None

class TestKeyRequest(BaseModel):
    provider: str
    api_key: str
    model: Optional[str] = None

@app.get("/api/settings")
def get_settings():
    return ai_engine.config

@app.post("/api/settings")
def update_settings(req: SettingsUpdateRequest):
    ai_engine.config['active_provider'] = req.active_provider
    ai_engine.config['providers'] = req.providers
    ai_engine.config['watch_paths'] = req.watch_paths
    if req.academic_base: ai_engine.config['academic_base'] = req.academic_base
    if req.personal_base: ai_engine.config['personal_base'] = req.personal_base
    if req.project_base: ai_engine.config['project_base'] = req.project_base
    if req.game_base: ai_engine.config['game_base'] = req.game_base
    if req.custom_models is not None: ai_engine.config['custom_models'] = req.custom_models
    if req.models_registry is not None: ai_engine.config['models_registry'] = req.models_registry

    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(ai_engine.config, f, indent=2)
    ai_engine.reload_config()

    # Restart watcher with new paths safely
    global watcher
    try:
        if watcher:
            watcher.stop()
        valid_paths = [p for p in req.watch_paths if os.path.exists(p)]
        watcher = MultiPathWatcher(queue_mgr, valid_paths)
        watcher.start()
    except Exception as e:
        print(f"Error restarting watcher: {e}")

    return {"success": True, "config": ai_engine.config}

@app.post("/api/settings/test-key")
def test_provider_key(req: TestKeyRequest):
    prov = req.provider.lower().strip()
    key = req.api_key.strip()
    if not key and prov not in ['local', 'ollama']:
        return {"success": False, "message": "Kunci API tidak boleh kosong."}

    try:
        if prov == 'gemini':
            url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
            r = requests.get(url, timeout=7)
            if r.status_code == 200:
                data = r.json()
                models_count = len(data.get('models', []))
                return {"success": True, "message": f"Koneksi Google Gemini API Valid ({models_count} model terdeteksi)!"}
            else:
                return {"success": False, "message": f"Gemini API Error ({r.status_code}): {r.text[:160]}"}
        elif prov == 'openrouter':
            url = "https://openrouter.ai/api/v1/auth/key"
            headers = {"Authorization": f"Bearer {key}"}
            r = requests.get(url, headers=headers, timeout=7)
            if r.status_code == 200:
                data = r.json()
                label = data.get('data', {}).get('label') or 'Kunci Valid'
                limit = data.get('data', {}).get('limit')
                limit_info = f" â€¢ Limit: ${limit}" if limit else ""
                return {"success": True, "message": f"Koneksi OpenRouter Berhasil ({label}{limit_info})!"}
            else:
                return {"success": False, "message": f"OpenRouter Error ({r.status_code}): {r.text[:160]}"}
        elif prov == 'openai':
            url = "https://api.openai.com/v1/models"
            headers = {"Authorization": f"Bearer {key}"}
            r = requests.get(url, headers=headers, timeout=7)
            if r.status_code == 200:
                return {"success": True, "message": "Koneksi OpenAI API Berhasil & Kunci Valid!"}
            else:
                return {"success": False, "message": f"OpenAI Error ({r.status_code}): {r.text[:160]}"}
        elif prov == 'groq':
            url = "https://api.groq.com/openai/v1/models"
            headers = {"Authorization": f"Bearer {key}"}
            r = requests.get(url, headers=headers, timeout=7)
            if r.status_code == 200:
                return {"success": True, "message": "Koneksi Groq API Berhasil (Super Fast Inference Siap)!"}
            else:
                return {"success": False, "message": f"Groq Error ({r.status_code}): {r.text[:160]}"}
        elif prov == 'deepseek':
            url = "https://api.deepseek.com/models"
            headers = {"Authorization": f"Bearer {key}"}
            r = requests.get(url, headers=headers, timeout=7)
            if r.status_code == 200:
                return {"success": True, "message": "Koneksi DeepSeek API Berhasil & Model Tersedia!"}
            else:
                return {"success": False, "message": f"DeepSeek Error ({r.status_code}): {r.text[:160]}"}
        elif prov == 'ollama':
            url = "http://localhost:11434/api/tags"
            r = requests.get(url, timeout=5)
            if r.status_code == 200:
                models = [m.get('name') for m in r.json().get('models', [])]
                return {"success": True, "message": f"Ollama Local Server Aktif! Model terpasang: {', '.join(models[:4]) or 'Belum ada model'}"}
            else:
                return {"success": False, "message": f"Ollama Server merespons code {r.status_code}."}
        elif prov == 'custom':
            return {"success": True, "message": "Endpoint Custom disimpan. Siap digunakan via OpenAI API contract."}
        else:
            return {"success": True, "message": f"Provider {prov} lokal aktif & siap digunakan."}
    except Exception as e:
        return {"success": False, "message": f"Gagal menghubungi server API: {str(e)}"}


class ModelsRegistryRequest(BaseModel):
    models: List[dict]

@app.get("/api/models")
def get_registered_models():
    """Returns the list of user registered models from config.json."""
    return {"models": ai_engine.config.get('models_registry', [])}

@app.post("/api/models")
def save_registered_models(req: ModelsRegistryRequest):
    """Saves user models registry (add, edit, delete)."""
    ai_engine.config['models_registry'] = req.models
    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(ai_engine.config, f, indent=2)
    ai_engine.reload_config()
    return {"success": True, "models": req.models}

@app.get("/api/models/ollama")
def get_ollama_models(endpoint: Optional[str] = "http://localhost:11434"):
    try:
        url = f"{endpoint.rstrip('/')}/api/tags"
        r = requests.get(url, timeout=4)
        if r.status_code == 200:
            models = [m.get('name') for m in r.json().get('models', [])]
            return {"success": True, "models": models}
        return {"success": False, "models": [], "error": f"Status {r.status_code}"}
    except Exception as e:
        return {"success": False, "models": [], "error": str(e)}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # client heartbeat
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

# Mount frontend UI
frontend_dir = os.path.join(PROJECT_ROOT, 'frontend')
if not os.path.exists(frontend_dir):
    frontend_dir = os.path.join(PROJECT_ROOT, 'static')

app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

def start_server(host="127.0.0.1", port=8765, reload=False):
    import uvicorn
    uvicorn.run(app, host=host, port=port, log_level="info")

if __name__ == "__main__":
    start_server()
