"""
OmniFile AI - Standalone Native Desktop Application
Manages the complete lifecycle:
- Automatically starts embedded FastAPI backend + Watchdog on launch.
- Automatically shuts down backend and watchdog when the desktop window is closed.
- Zero manual backend starting needed.
"""

import os
import sys
import time
import socket
import threading
import urllib.request
import webview
import uvicorn
from app import app, watcher

APP_PORT = 8765
APP_HOST = "127.0.0.1"
APP_URL = f"http://{APP_HOST}:{APP_PORT}"

server_instance = None

def is_port_in_use(host=APP_HOST, port=APP_PORT):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex((host, port)) == 0

def start_backend_server():
    global server_instance
    config = uvicorn.Config(
        app,
        host=APP_HOST,
        port=APP_PORT,
        log_level="warning",
        access_log=False
    )
    server_instance = uvicorn.Server(config)
    server_instance.run()

def on_app_closed():
    """Graceful cleanup when user closes the desktop window."""
    try:
        if watcher:
            watcher.stop()
    except Exception:
        pass
    
    global server_instance
    if server_instance:
        server_instance.should_exit = True

    # Terminate process immediately
    os._exit(0)

def main():
    # 1. Start embedded backend server automatically if port not already active
    if not is_port_in_use():
        srv_thread = threading.Thread(target=start_backend_server, daemon=True)
        srv_thread.start()
        
        # Wait until server responds with 200 OK (takes ~300ms)
        for _ in range(50):
            if is_port_in_use():
                try:
                    with urllib.request.urlopen(f"{APP_URL}/api/status", timeout=0.8) as r:
                        if r.status == 200:
                            break
                except Exception:
                    pass
            time.sleep(0.08)

    # 2. Create standalone desktop application window
    window = webview.create_window(
        title="OmniFile AI — Smart File Manager & PC Organizer",
        url=APP_URL,
        width=1340,
        height=840,
        min_size=(980, 650),
        background_color="#FFFFFF",
        text_select=True,
        zoomable=True,
        confirm_close=False
    )
    
    window.events.closing += on_app_closed
    window.events.closed += on_app_closed
    
    # 3. Enter native desktop window event loop
    webview.start(debug=False)
    
    # Safety cleanup after window exits
    on_app_closed()

if __name__ == "__main__":
    main()
