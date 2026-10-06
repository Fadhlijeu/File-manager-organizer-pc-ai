"""
OmniFile AI - Unified CLI & Application Launcher

Modes:
  python main.py             Launch desktop application (default)
  python main.py --desktop   Launch native desktop window (Edge App Mode)
  python main.py --server    Run FastAPI backend server only
  python main.py --help      Show help message
"""

import sys
import os
import argparse

# Ensure project root & src are in sys.path
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(PROJECT_ROOT, "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

def main():
    parser = argparse.ArgumentParser(
        description="OmniFile AI - Autonomous Local File Management & AI Organizer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  python main.py             # Launch native desktop application (Edge App Mode)
  python main.py --server    # Run headless web API server on http://127.0.0.1:8765
  python main.py --port 9000 # Run server on custom port
"""
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--desktop", action="store_true", help="Launch native standalone desktop UI (default)")
    group.add_argument("--server", action="store_true", help="Run FastAPI backend server only")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface for server (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8765, help="Port for server (default: 8765)")

    args = parser.parse_args()

    if args.server:
        print(f"[OmniFile AI] Starting Backend Server on http://{args.host}:{args.port} ...")
        from src.app import start_server
        start_server(host=args.host, port=args.port)
    else:
        # Default mode: Launch desktop application
        from src.desktop_app import main as launch_desktop
        launch_desktop()

if __name__ == "__main__":
    main()
