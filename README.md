# OmniFile AI — Desktop File Manager & PC Organizer

OmniFile AI is a desktop-first, high-density autonomous file management and organization system designed for power users, students, and software engineers. Built with a neutral monochrome design system inspired by internal support tools (Nuvio Support style), it couples deep document content inspection with multi-provider AI reasoning, kernel filesystem monitoring, and deterministic host operations.

---

## Architectural Principles

1. **Desktop-First & High-Density UI**:
   - Monochromatic, distraction-free aesthetic with signature framed panel borders (diagonal linear-gradient striping with clean white surface cards).
   - Strict Inter typography (400, 500, 600) with tabular numeric formatting for KPIs, percentages, and metrics.
   - 100% pure HTML, Vanilla CSS, and JavaScript. Zero external UI frameworks, zero Tailwind, zero glassmorphism, and zero emojis.

2. **Standalone Native Desktop Lifecycle**:
   - Runs in a native Windows Edge WebView2 window via pywebview.
   - Embedded FastAPI and Windows watchdog services start automatically on launch and terminate gracefully when the desktop window is closed.
   - Zero manual command-line or backend initialization required.

3. **Multi-Provider AI Reasoning**:
   - **Google Gemini**: Default model gemini-3.5-flash-lite, with built-in presets for gemini-2.5-flash and gemini-2.5-pro.
   - **OpenRouter**: Support for Claude 3.5 Sonnet, Llama 3.3 70B, and DeepSeek V3.
   - **OpenAI**: Support for GPT-4o, GPT-4o-mini, and o3-mini.
   - **Local Autonomous Agent**: Deterministic offline heuristic reasoning via host PowerShell queries and content regex matching.

4. **Real-Time Kernel Watchdog & Staging Queue**:
   - Continuously monitors download directories (e.g. D:\DOWNLOAD) and documents (OneDrive\Documents) via OS kernel events.
   - Routes newly detected files into an incoming staging queue with instant content classification, confidence scoring, and one-click move.

5. **Deep Document Content Extraction**:
   - Reads internal text and metadata from .pdf, .docx, .pptx, .xlsx, codebases, and media.
   - Classifies academic coursework (e.g., Gunadarma 2KA31 and 3KA31 courses) based on substantive content rather than filenames alone.

6. **Deterministic Host Operations & Typed Mentions**:
   - Safe CRUD operations (atomic move, rename, directory creation, safe recycle bin integration).
   - Precision targeting using typed mentions:
     - @file:<filename>: Passes file metadata, size, and parsed content to the agent context.
     - @folder:<foldername>: Passes directory structure and recursive item counts.
     - @path:<absolute_path>: Points the agent directly to host directories.

---

## Quick Start Guide

### 1. Prerequisites
- Python 3.10+
- Windows 10/11 with Microsoft Edge WebView2 runtime (pre-installed on Windows 10/11)

### 2. Installation
Clone the repository and install required Python packages:

`ash
git clone https://github.com/Fadhlijeu/File-manager-organizer-pc-ai.git
cd File-manager-organizer-pc-ai
pip install -r requirements.txt
`

### 3. Configuration
Copy the sample configuration file and insert your API keys:

`ash
copy config.example.json config.json
`

Or configure API keys directly inside the desktop application under **Pengaturan / Provider & Model**.

### 4. Running the Application

- **Native Desktop Window**:
  `cmd
  python desktop_app.py
  `
- **Silent Background Launcher**:
  Run launch.bat or double-click OmniFile AI.lnk on your Desktop.
- **Web Browser Interface**:
  Run python app.py and open http://127.0.0.1:8765.

---

## Project Structure

```text
File-manager-organizer-pc-ai/
├── src/                                  # Backend Python source code & engines
│   ├── app.py                            # FastAPI REST, SSE, and WebSocket server
│   ├── agent_engine.py                   # Autonomous ReAct agent & host execution
│   ├── ai_engine.py                      # Multi-provider AI reasoning & LLM integration
│   ├── ai_decide.py                      # Context-aware safety evaluator & rules
│   ├── crud_engine.py                    # Safe file operations & Recycle Bin integration
│   ├── content_extractor.py              # Document content & metadata parser
│   ├── activity_tracker.py               # Real-time telemetry & persistent metrics
│   ├── watcher.py                        # Windows kernel filesystem watchdog listener
│   └── desktop_app.py                    # Standalone native desktop launcher (Edge App Mode)
├── frontend/                             # Single-page desktop UI application
│   ├── index.html                        # Semantic dashboard markup & layouts
│   ├── styles.css                        # Hallmark design system tokens & styles
│   ├── app.js                            # UI controller, WebSocket & interactive widgets
│   ├── lucide.min.js                     # Lucide icon library
│   └── marked.min.js                     # Fast markdown rendering engine
├── config/                               # Settings & configuration
│   ├── config.json                       # Local settings & active API credentials (git-ignored)
│   └── config.example.json               # Configuration template
├── data/                                 # Runtime persistent state
│   └── activity_log.json                 # Persistent activity store (git-ignored)
├── logs/                                 # Runtime logs
│   ├── desktop_runtime.log               # Desktop lifecycle logs (git-ignored)
│   └── desktop_debug.log                 # Debug logs (git-ignored)
├── scripts/                              # Startup & automation scripts
│   ├── launch.bat                        # Batch launcher script
│   └── launch_silent.vbs                 # Silent background VBS launcher
├── workflows/                            # Architecture & project specifications
│   ├── 00_overview.md                    # Core vision & principles
│   ├── 01_requirements.md                # Functional & safety requirements
│   ├── 02_architecture.md                # System & module architecture
│   ├── 04_data_models.md                 # Data schemas & telemetry models
│   ├── 06_ui_design_system.md            # Design system & tokens
│   └── 08_milestones.md                  # Roadmap & completed milestones
├── AGENT_NOTICE.md                       # Agent governance & safety constraints
├── progress.md                           # Session memory & changelog
├── main.py                               # Unified entrypoint (CLI & GUI launcher)
├── launch.bat                            # Quick launcher shortcut
├── launch_silent.vbs                     # Silent launcher shortcut
├── requirements.txt                      # Python dependencies
├── README.md                             # Project documentation
├── LICENSE                               # MIT License
└── .gitignore
```

---

## License

This project is open-source under the [MIT License](LICENSE).
