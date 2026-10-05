"""
OmniFile AI - High-Performance Native Desktop Launcher
Optimized for instant launch, zero deadlock, reliable lifecycle:
- Checks if backend already active; if not, starts it in background.
- Opens native standalone window via Edge App Mode (no address bar, no browser chrome).
- Automatically shuts down backend when window is closed.
- Auto-restarts if backend crashes while window is open.
"""

import os
import sys
import time
import socket
import subprocess
import urllib.request
import ctypes
import threading

APP_DIR = os.path.dirname(os.path.abspath(__file__))
if APP_DIR not in sys.path:
    sys.path.insert(0, APP_DIR)
os.chdir(APP_DIR)

APP_PORT = 8765
APP_HOST = "127.0.0.1"
APP_URL = f"http://{APP_HOST}:{APP_PORT}"
LOG_FILE = os.path.join(APP_DIR, "desktop_runtime.log")

def log(msg):
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}\n")
    except Exception:
        pass

def is_port_in_use(host=APP_HOST, port=APP_PORT):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex((host, port)) == 0

def is_server_alive():
    """Quick health check — returns True only if server responds with HTTP 200."""
    try:
        with urllib.request.urlopen(f"{APP_URL}/api/status", timeout=1.0) as r:
            return r.status == 200
    except Exception:
        return False

def find_python_exe():
    """Always use python.exe (not pythonw.exe) for spawning backend."""
    exe = sys.executable
    if exe.lower().endswith("pythonw.exe"):
        candidate = os.path.join(os.path.dirname(exe), "python.exe")
        if os.path.isfile(candidate):
            return candidate
    return exe

def find_edge_path():
    candidates = [
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%LocalAppData%\Microsoft\Edge\Application\msedge.exe"),
    ]
    for p in candidates:
        if os.path.isfile(p):
            return p
    return None

def start_backend_subprocess():
    python_exe = find_python_exe()
    app_script = os.path.join(APP_DIR, "app.py")
    creationflags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0

    log(f"Starting backend: {python_exe} {app_script}")
    proc = subprocess.Popen(
        [python_exe, "-u", app_script],
        cwd=APP_DIR,
        creationflags=creationflags,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    log(f"Backend PID: {proc.pid}")
    return proc

def wait_for_server(timeout_sec=12.0):
    """Poll /api/status until it responds 200 or timeout. Exponential backoff."""
    start = time.time()
    interval = 0.1
    while time.time() - start < timeout_sec:
        if is_port_in_use() and is_server_alive():
            log(f"Backend ready after {time.time()-start:.1f}s")
            return True
        time.sleep(interval)
        interval = min(interval * 1.4, 0.8)  # exponential backoff up to 0.8s
    return False

def show_error(msg):
    try:
        ctypes.windll.user32.MessageBoxW(0, msg, "OmniFile AI", 0x30)
    except Exception:
        pass

def main():
    log("=" * 50)
    log("OmniFile AI Desktop Launcher started.")
    spawned_backend = None

    try:
        # 1. Start backend only if not already running
        if not is_port_in_use():
            spawned_backend = start_backend_subprocess()
            log("Waiting for backend to become ready...")
            ready = wait_for_server(timeout_sec=15.0)
            if not ready:
                log("ERROR: Backend did not respond within 15 seconds.")
                show_error(
                    "OmniFile AI gagal memuat dalam 15 detik.\n\n"
                    "Pastikan semua dependensi telah diinstall:\n"
                    "  pip install -r requirements.txt\n\n"
                    "Periksa desktop_runtime.log untuk detail."
                )
                return
        else:
            log("Backend already running on port 8765.")

        # 2. Open native Edge App Mode window
        edge_path = find_edge_path()
        if edge_path:
            log(f"Launching Edge App Mode: {edge_path}")
            user_data = os.path.join(
                os.environ.get("LOCALAPPDATA", os.path.expanduser("~")),
                "OmniFileAI", "AppProfile"
            )
            os.makedirs(user_data, exist_ok=True)

            edge_cmd = [
                edge_path,
                f"--app={APP_URL}",
                f"--user-data-dir={user_data}",
                "--window-size=1360,860",
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-extensions",
                "--disable-background-networking",
            ]
            edge_proc = subprocess.Popen(edge_cmd)
            log(f"Edge App Mode PID: {edge_proc.pid}. Waiting for user close...")

            # Wait for window close; also monitor backend health
            while True:
                ret = edge_proc.poll()
                if ret is not None:
                    log(f"Edge window closed (exit code {ret}).")
                    break
                # If we spawned the backend, check it's still alive
                if spawned_backend and spawned_backend.poll() is not None:
                    log("Backend crashed! Attempting restart...")
                    spawned_backend = start_backend_subprocess()
                    wait_for_server(timeout_sec=10.0)
                time.sleep(1.0)

        else:
            # Fallback: pywebview (requires: pip install pywebview)
            log("Edge not found, trying pywebview fallback...")
            try:
                import webview
                window = webview.create_window(
                    title="OmniFile AI",
                    url=APP_URL,
                    width=1360,
                    height=860,
                    min_size=(980, 650),
                    background_color="#FFFFFF",
                )
                webview.start(debug=False)
                log("pywebview closed.")
            except ImportError:
                show_error(
                    "Microsoft Edge tidak ditemukan dan pywebview tidak terinstall.\n\n"
                    "Buka manual di browser:\n" + APP_URL
                )

    except Exception as e:
        log(f"Fatal error: {e}")
        show_error(f"OmniFile AI error:\n{str(e)}")

    finally:
        # 3. Clean shutdown of backend we spawned
        if spawned_backend:
            log("Shutting down backend...")
            try:
                spawned_backend.terminate()
                spawned_backend.wait(timeout=3.0)
            except Exception:
                try:
                    spawned_backend.kill()
                except Exception:
                    pass
            log("Backend shutdown complete.")

        log("Launcher exiting.")
        sys.exit(0)

if __name__ == "__main__":
    main()
