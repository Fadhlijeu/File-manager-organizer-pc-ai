
/* ========================================================
   LIVE REALTIME AGENT STATUS & STEP STREAMING CONTROLLER
   ======================================================== */
function handleLiveAgentWsEvent(msg) {
  const thinkingBox = document.getElementById('agentThinkingBox');
  if (!thinkingBox) return;

  if (msg.type === 'agent_status') {
    let banner = document.getElementById('agentLiveStatusBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'agentLiveStatusBanner';
      thinkingBox.prepend(banner);
    }

    if (msg.status === 'model_error' || msg.status === 'retrying') {
      banner.className = 'agent-status-banner rate-limit';
      const countdownHtml = msg.countdown ? `<span class="agent-countdown-chip">${msg.countdown}s</span>` : '';
      banner.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div style="flex:1;">
          <strong>Pemberitahuan Model:</strong> ${escapeHtml(msg.message)}
        </div>
        ${countdownHtml}
      `;
    } else if (msg.status === 'switching_provider') {
      banner.className = 'agent-status-banner switching';
      banner.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        <div style="flex:1;">
          <strong>Auto Failover:</strong> ${escapeHtml(msg.message)}
        </div>
      `;
    } else if (msg.status === 'recovered') {
      banner.className = 'agent-status-banner recovered';
      banner.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <div style="flex:1;">
          <strong>Status Normal:</strong> ${escapeHtml(msg.message)}
        </div>
      `;
      setTimeout(() => { if (banner) banner.remove(); }, 3500);
    }
  } else if (msg.type === 'agent_step') {
    if (msg.tool === 'finish') return; // Do not show internal control flow finish tool

    let stepsContainer = document.getElementById('agentLiveStepsContainer');
    if (!stepsContainer) {
      stepsContainer = document.createElement('div');
      stepsContainer.id = 'agentLiveStepsContainer';
      stepsContainer.className = 'live-steps-container';
      thinkingBox.appendChild(stepsContainer);
    }

    let stepChip = document.getElementById(`liveStepChip-${msg.step}`);
    if (!stepChip) {
      stepChip = document.createElement('div');
      stepChip.id = `liveStepChip-${msg.step}`;
      stepChip.className = 'live-step-chip running';
      stepsContainer.appendChild(stepChip);
    }

    let cleanThought = (msg.thought || 'Memproses instruksi...').trim();
    if (cleanThought.length > 85) cleanThought = cleanThought.substring(0, 85) + '...';

    const toolName = msg.tool && msg.tool !== 'thinking' ? msg.tool : 'analisis';
    stepChip.innerHTML = `
      <span class="live-chip-status-dot"></span>
      <span class="live-chip-tool-badge">${escapeHtml(toolName)}</span>
      <span class="live-chip-text"><strong>Langkah ${msg.step}:</strong> ${escapeHtml(cleanThought)}</span>
    `;
    const box = document.getElementById('chatHistoryBox');
    if (box) box.scrollTop = box.scrollHeight;
  } else if (msg.type === 'agent_step_done') {
    if (msg.tool === 'finish') return;

    let stepChip = document.getElementById(`liveStepChip-${msg.step}`);
    if (stepChip) {
      stepChip.className = 'live-step-chip done';
      let preview = (msg.output || 'Tereksekusi').trim().replace(/\s+/g, ' ');
      if (preview.length > 70) preview = preview.substring(0, 70) + '...';
      stepChip.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <span class="live-chip-tool-badge done">${escapeHtml(msg.tool || 'selesai')}</span>
        <span class="live-chip-text"><strong>Langkah ${msg.step} Sukses:</strong> ${escapeHtml(preview)}</span>
      `;
    }
  }
}

/* ========================================================
   FILE TREE CONTEXTUAL MENU & ACTION CONTROLLERS
   ======================================================== */
let activeTreeContextMenuEl = null;

function closeTreeContextMenu() {
  if (activeTreeContextMenuEl) {
    activeTreeContextMenuEl.remove();
    activeTreeContextMenuEl = null;
  }
}

document.addEventListener('click', (e) => {
  if (activeTreeContextMenuEl && !activeTreeContextMenuEl.contains(e.target) && !e.target.closest('.btn-tree-menu')) {
    closeTreeContextMenu();
  }
});

function openTreeContextMenu(btn, event) {
  event.stopPropagation();
  event.preventDefault();
  closeTreeContextMenu();

  const type = btn.getAttribute('data-type') || 'file';
  const name = btn.getAttribute('data-name') || '';
  const path = btn.getAttribute('data-path') || '';

  const menu = document.createElement('div');
  menu.className = 'tree-dropdown-menu';

  if (type === 'file') {
    menu.innerHTML = `
      <button type="button" class="tree-menu-item" onclick="treeActionMentionFromMenu('${escapeHtml(type)}', '${escapeHtml(name)}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></svg>
        <span>Tandai @file di Chat</span>
      </button>
      <button type="button" class="tree-menu-item" onclick="treeActionOpenFile('${escapeHtml(path)}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        <span>Buka Berkas (Default App)</span>
      </button>
      <button type="button" class="tree-menu-item" onclick="treeActionOpenExplorer('${escapeHtml(path)}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
        <span>Buka di Windows Explorer</span>
      </button>
      <button type="button" class="tree-menu-item" onclick="treeActionCopyText('${escapeHtml(path || name)}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <span>Salin Path Lengkap</span>
      </button>
      <button type="button" class="tree-menu-item danger" onclick="treeActionDelete('${escapeHtml(path || name)}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        <span>Hapus ke Recycle Bin</span>
      </button>
    `;
  } else {
    menu.innerHTML = `
      <button type="button" class="tree-menu-item" onclick="treeActionMentionFromMenu('${escapeHtml(type)}', '${escapeHtml(name)}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></svg>
        <span>Tandai @folder di Chat</span>
      </button>
      <button type="button" class="tree-menu-item" onclick="treeActionNavigateFolder('${escapeHtml(path || name)}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>Buka di Tab Explorer Web</span>
      </button>
      <button type="button" class="tree-menu-item" onclick="treeActionOpenExplorer('${escapeHtml(path || name)}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
        <span>Buka di Windows Explorer</span>
      </button>
      <button type="button" class="tree-menu-item" onclick="treeActionCopyText('${escapeHtml(path || name)}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <span>Salin Path Folder</span>
      </button>
    `;
  }

  document.body.appendChild(menu);
  activeTreeContextMenuEl = menu;

  const rect = btn.getBoundingClientRect();
  const menuWidth = 190;
  let left = rect.right - menuWidth;
  if (left < 10) left = rect.left;
  let top = rect.bottom + 4;
  if (top + 180 > window.innerHeight) {
    top = rect.top - 170;
  }

  menu.style.left = `${Math.max(10, left)}px`;
  menu.style.top = `${Math.max(10, top)}px`;
}

function treeActionMention(btn) {
  const type = btn.getAttribute('data-type') || 'file';
  const name = btn.getAttribute('data-name') || '';
  treeActionMentionFromMenu(type, name);
}

function treeActionMentionFromMenu(type, name) {
  closeTreeContextMenu();
  const safeName = name.includes(' ') ? `"${name}"` : name;
  insertTokenIntoChat(`@${type}:${safeName} `);
  showToast(`Ditandai: @${type}:${safeName}`);
}

function treeActionCopy(btn) {
  const path = btn.getAttribute('data-path') || btn.getAttribute('data-name') || '';
  treeActionCopyText(path);
}

function treeActionCopyText(text) {
  closeTreeContextMenu();
  navigator.clipboard.writeText(text).then(() => {
    showToast(`Disalin ke clipboard: ${text}`);
  });
}

async function treeActionOpenFile(path) {
  closeTreeContextMenu();
  if (!path) return;
  try {
    const res = await fetch('/api/crud/open-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: path })
    });
    const d = await res.json();
    if (d.success) {
      showToast(`Membuka berkas: ${path}`);
    } else {
      showToast(`Gagal membuka: ${d.error || 'Terjadi kesalahan'}`);
    }
  } catch(e) {
    showToast(`Error: ${e.message}`);
  }
}

async function treeActionOpenExplorer(path) {
  closeTreeContextMenu();
  if (!path) return;
  try {
    const res = await fetch('/api/crud/open-explorer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: path })
    });
    const d = await res.json();
    if (d.success) {
      showToast(`Membuka di Windows Explorer.`);
    } else {
      showToast(`Gagal: ${d.error || 'Terjadi kesalahan'}`);
    }
  } catch(e) {
    showToast(`Error: ${e.message}`);
  }
}

function treeActionNavigateFolder(path) {
  closeTreeContextMenu();
  if (!path) return;
  navigatePath(path);
  showToast(`Membuka folder: ${path}`);
}

async function treeActionDelete(path) {
  closeTreeContextMenu();
  if (!path) return;
  if (!confirm(`Apakah Anda yakin ingin memindahkan berkas berikut ke Recycle Bin?\n\n${path}`)) return;
  try {
    const res = await fetch('/api/crud/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: path, force: true })
    });
    const d = await res.json();
    if (d.success) {
      showToast("Berkas berhasil dipindahkan ke Recycle Bin.");
      refreshCurrentFolder();
    } else {
      showToast(`Gagal: ${d.error || 'Tidak dapat menghapus berkas'}`);
    }
  } catch(e) {
    showToast(`Error: ${e.message}`);
  }
}


// Semantic Action Buttons Builder in Chat
function renderCustomActionButtonsFromText(body) {
  const lines = body.trim().split('\n');
  const buttons = [];

  lines.forEach(line => {
    const s = line.trim();
    if (!s) return;
    const parts = s.split('|').map(p => p.trim());
    if (parts.length >= 2) {
      let rawLabel = parts[0].replace(/^\[|\]$/g, '').trim();
      let type = parts[1].toLowerCase().trim() || 'primary';
      let actionStr = parts[2] || '';
      let desc = parts[3] || '';

      let actionType = 'chat';
      let actionPayload = actionStr;

      if (actionStr.startsWith('powershell:')) {
        actionType = 'powershell';
        actionPayload = actionStr.slice(11).trim();
      } else if (actionStr.startsWith('chat:')) {
        actionType = 'chat';
        actionPayload = actionStr.slice(5).trim();
      } else if (actionStr.startsWith('crud_delete:')) {
        actionType = 'crud_delete';
        actionPayload = actionStr.slice(12).trim();
      }

      const iconSvg = actionType === 'powershell' 
        ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>'
        : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';

      buttons.push(`
        <button type="button" class="custom-ui-action-btn ${escapeHtml(type)}" 
                data-type="${escapeHtml(actionType)}" 
                data-payload="${escapeHtml(actionPayload)}" 
                onclick="handleSemanticActionClick(this)"
                title="${escapeHtml(desc || rawLabel)}">
          ${iconSvg}
          <span>${escapeHtml(rawLabel)}</span>
        </button>
      `);
    }
  });

  return `<div class="custom-ui-action-group">${buttons.join('')}</div>`;
}

async function handleSemanticActionClick(btn) {
  const actionType = btn.getAttribute('data-type');
  const actionPayload = btn.getAttribute('data-payload');

  btn.disabled = true;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = `<span style="font-size: 11px;">Mengeksekusi...</span>`;

  if (actionType === 'powershell') {
    try {
      const res = await fetch('/api/action/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: actionPayload })
      });
      const data = await res.json();
      if (data.success) {
        btn.className = 'custom-ui-action-btn executed';
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Selesai Dijalankan`;
        showToast("Perintah PowerShell berhasil dieksekusi!");
        refreshCurrentFolder();
        fetchStorageDetails();
      } else {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        showToast(`Gagal: ${data.error || 'Terjadi kesalahan eksekusi'}`);
      }
    } catch (e) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
      showToast(`Error: ${e.message}`);
    }
  } else if (actionType === 'crud_delete') {
    try {
      const res = await fetch('/api/crud/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: actionPayload, force: true })
      });
      const data = await res.json();
      if (data.success) {
        btn.className = 'custom-ui-action-btn executed';
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Berhasil Dihapus`;
        showToast(`Berkas berhasil dihapus ke Recycle Bin!`);
        refreshCurrentFolder();
      } else {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        showToast(`Gagal hapus: ${data.error}`);
      }
    } catch (e) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
      showToast(`Error: ${e.message}`);
    }
  } else if (actionType === 'chat') {
    btn.className = 'custom-ui-action-btn executed';
    sendQuickPrompt(actionPayload);
  }
}


// Marked.js Configuration: disable 4-space indented code blocks so markdown lists and HTML never become code blocks
if (typeof marked !== 'undefined' && marked.use) {
  try {
    marked.use({
      tokenizer: {
        code(src) {
          // Disable 4-space indented code blocks completely
          return false;
        }
      }
    });
  } catch (e) {
    console.warn("Could not customize marked tokenizer:", e);
  }
}

/* ==========================================================================
   OmniFile AI — Controller Engine & Neutral Support Dashboard UI
   Inspired by Nuvio Support: Monochromatic, Desktop-First, High-Density
   ========================================================================== */

// Global Application State
let currentPath = "D:\\";
let activeTab = "overview";
let activeModel = "gemini-3.5-flash-lite";
let activeProvider = "gemini";
let providersConfig = {};
let watchPathsList = ["D:\\DOWNLOAD", "C:\\Users\\fadhl\\OneDrive\\Documents"];
let basePaths = {
  academic_base: "D:\\Kuliah",
  personal_base: "D:\\fadhl",
  project_base: "D:\\PROJECT",
  game_base: "D:\\Game"
};

let allCurrentFolders = [];
let allCurrentFiles = [];
let allQueueItems = [];
let selectedQueueIds = new Set();
let ws = null;
let liveAgentPhaseTimer = null;
let chatHistoryTurns = [];

// Global Custom User Models List
let savedCustomModels = [];

// Global User Models Registry (Full User Freedom: Delete, Add, Modify)
const DEFAULT_MODELS_REGISTRY = [
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite (Cepat & Default)", provider: "gemini" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Performa Tinggi)", provider: "gemini" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Penalaran Kompleks)", provider: "gemini" },
  { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Jendela Konteks Luas)", provider: "gemini" },
  { id: "openrouter/anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet (OpenRouter)", provider: "openrouter" },
  { id: "openrouter/deepseek/deepseek-r1", label: "DeepSeek R1 (OpenRouter)", provider: "openrouter" },
  { id: "groq/llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile (~300 t/s)", provider: "groq" },
  { id: "deepseek/deepseek-chat", label: "DeepSeek-V3 Official", provider: "deepseek" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini (OpenAI)", provider: "openai" },
  { id: "local-heuristic", label: "Agen Mandiri Offline (PowerShell)", provider: "local" }
];

let userModelsRegistry = [...DEFAULT_MODELS_REGISTRY];
let editingModelId = null;


// Provider & Models Catalog (8 Providers + Full User Freedom)
const PROVIDER_METADATA = {
  gemini: {
    name: "Google Gemini",
    models: [
      { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite (Cepat & Default)" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Performa Tinggi)" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Penalaran Kompleks)" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Jendela Konteks Luas)" }
    ],
    defaultModel: "gemini-3.5-flash-lite",
    hasKey: true
  },
  openrouter: {
    name: "OpenRouter",
    models: [
      { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet (Anthropic)" },
      { id: "deepseek/deepseek-r1", label: "DeepSeek R1 Reasoning (DeepSeek)" },
      { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B (Meta)" },
      { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash via OpenRouter" },
      { id: "mistralai/mistral-large-2411", label: "Mistral Large 2411" }
    ],
    defaultModel: "anthropic/claude-3.5-sonnet",
    hasKey: true
  },
  openai: {
    name: "OpenAI",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o Mini (Cepat & Hemat)" },
      { id: "gpt-4o", label: "GPT-4o (Flagship Multimodal)" },
      { id: "o3-mini", label: "o3-mini (Reasoning Model)" },
      { id: "o1", label: "o1 (Penalaran Mendalam)" }
    ],
    defaultModel: "gpt-4o-mini",
    hasKey: true
  },
  groq: {
    name: "Groq (Ultra-Fast)",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile (~300 t/s)" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant (~800 t/s)" },
      { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B (Konteks 32k)" }
    ],
    defaultModel: "llama-3.3-70b-versatile",
    hasKey: true
  },
  deepseek: {
    name: "DeepSeek API",
    models: [
      { id: "deepseek-chat", label: "DeepSeek-V3 (DeepSeek Chat)" },
      { id: "deepseek-reasoner", label: "DeepSeek-R1 (DeepSeek Reasoner)" }
    ],
    defaultModel: "deepseek-chat",
    hasKey: true
  },
  ollama: {
    name: "Ollama (Lokal)",
    models: [
      { id: "llama3.2", label: "Ollama: Llama 3.2" },
      { id: "qwen2.5-coder", label: "Ollama: Qwen 2.5 Coder" },
      { id: "mistral", label: "Ollama: Mistral" },
      { id: "deepseek-r1", label: "Ollama: DeepSeek R1" }
    ],
    defaultModel: "llama3.2",
    hasKey: false,
    needsEndpoint: true,
    defaultEndpoint: "http://localhost:11434"
  },
  custom: {
    name: "Custom OpenAI-Compatible",
    models: [
      { id: "default-model", label: "Model Bawaan Server Kustom" },
      { id: "local-model", label: "Local LLM (LM Studio / vLLM)" }
    ],
    defaultModel: "default-model",
    hasKey: true,
    needsEndpoint: true,
    defaultEndpoint: "http://localhost:1234/v1"
  },
  local: {
    name: "Agen Lokal Mandiri",
    models: [
      { id: "local-heuristic", label: "PowerShell Host Agent (Offline & Otomatis)" }
    ],
    defaultModel: "local-heuristic",
    hasKey: false
  }
};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  populateModelSelects();
  renderModelsManagementTable();
  initLucide();
  initWebSocket();
  navigatePath(currentPath);
  fetchQueue();
  fetchStorageDetails();
  loadSettingsFromServer();
  renderVolumeChart();
  renderTimelineUpdates('today');
  setupMentionListeners();
  setupGlobalShortcuts();
});

function initLucide() {
  if (window.lucide && window.lucide.createIcons) {
    window.lucide.createIcons();
  }
}

/* ========================================================
   1. WebSocket Real-time Listener
   ======================================================== */
function initWebSocket() {
  const loc = window.location;
  const wsUrl = `ws://${loc.hostname || '127.0.0.1'}:8765/ws`;
  try {
    ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.event === "file_added" || msg.event === "queue_updated") {
          fetchQueue();
          showToast(`Berkas baru masuk ke antrean: ${msg.filename || 'Item'}`);
        } else if (msg.type === "agent_step" || msg.type === "agent_step_done" || msg.type === "agent_status") {
          handleLiveAgentWsEvent(msg);
        }
      } catch (e) {}
    };
    ws.onclose = () => setTimeout(initWebSocket, 4000);
  } catch (e) {
    console.warn("WebSocket init error:", e);
  }
}

/* ========================================================
   2. Navigation Controller
   ======================================================== */
function switchNav(tabKey) {
  activeTab = tabKey;
  document.querySelectorAll('.sidebar-nav-item').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));

  const navBtn = document.getElementById(`nav-${tabKey}`);
  const tabView = document.getElementById(`view-${tabKey}`);
  if (navBtn) navBtn.classList.add('active');
  if (tabView) tabView.classList.add('active');

  const segment = document.getElementById('activeBreadcrumbSegment');
  const labels = {
    overview: 'Overview / Dashboard',
    folders: 'Explorer',
    queue: 'Incoming Staging Queue',
    home: 'AI Assistant',
    clean: 'Disk & Storage',
    settings: 'Pengaturan / Provider & Model'
  };
  if (segment) segment.textContent = labels[tabKey] || tabKey;

  if (tabKey === 'queue') fetchQueue();
  if (tabKey === 'clean') fetchStorageDetails();
  if (tabKey === 'settings') loadSettingsFromServer();

  initLucide();
}

function toggleSidebar() {
  const sidebar = document.getElementById('appSidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

/* ========================================================
   3. Overview Dashboard (KPI, Chart, Timeline, Table)
   ======================================================== */
function changeOverviewRange(val) {
  // Real stats are fetched from server
  fetchOverviewStats();
}


async function fetchOverviewStats() {
  try {
    const res = await fetch('/api/stats/overview');
    if (!res.ok) return;
    const json = await res.json();
    const data = json.data || {};

    const kpiFiles = document.getElementById('kpiTotalFiles');
    if (kpiFiles) kpiFiles.textContent = data.total_organized || 0;

    const totalEvents = document.getElementById('chartTotalEvents');
    if (totalEvents) totalEvents.textContent = data.total_io_events || 0;

    const cPindah = document.getElementById('countPindah');
    if (cPindah) cPindah.textContent = data.operations?.move || 0;

    const cRename = document.getElementById('countRename');
    if (cRename) cRename.textContent = data.operations?.rename || 0;

    const cScan = document.getElementById('countAiScan');
    if (cScan) cScan.textContent = data.operations?.ai_scan || 0;

    const actHeader = document.getElementById('activityCountHeader');
    if (actHeader) actHeader.textContent = `${data.total_io_events || 0} event hari ini`;

    renderVolumeChart(data.chart_bars || []);
    renderTimelineUpdates(data.events || []);

    const storageElem = document.getElementById('kpiStorageFree');
    if (storageElem && data.storage_free_gb) {
      storageElem.textContent = `${data.storage_free_gb} GB`;
    }
  } catch (e) {
    console.error('Error fetching overview stats:', e);
  }
}

function refreshOverviewData() {
  fetchQueue();
  fetchStorageDetails();
  fetchOverviewStats();
  showToast("Data dashboard diperbarui.");
}

function renderVolumeChart(barData) {
  const container = document.getElementById('volumeChartContainer');
  if (!container) return;
  container.innerHTML = '';

  const rawBuckets = Array.isArray(barData) && barData.length === 15 ? barData : [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
  const maxVal = Math.max(...rawBuckets, 1);
  const days = ['00-02', '02-04', '04-06', '06-08', '08-10', '10-12', '12-14', '14-16', '16-18', '18-20', '20-22', '22-24', 'Live-1', 'Live-2', 'Now'];

  rawBuckets.forEach((val, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chart-bar-btn';
    const pct = val === 0 ? 3 : Math.min(100, Math.round((val / maxVal) * 100));
    btn.style.setProperty('--bar-height', `${pct}%`);
    if (val === 0) {
      btn.style.opacity = '0.35';
    }
    btn.setAttribute('aria-label', `${days[i]}: ${val} events`);
    btn.innerHTML = `<span class="chart-bar-tooltip">${days[i]}: ${val} events</span>`;
    btn.onclick = () => {
      container.querySelectorAll('.chart-bar-btn').forEach(b => b.removeAttribute('aria-pressed'));
      btn.setAttribute('aria-pressed', 'true');
    };
    container.appendChild(btn);
  });
}

function renderTimelineUpdates(events) {
  const container = document.getElementById('timelineListContainer');
  if (!container) return;

  const list = Array.isArray(events) ? events : [];
  if (list.length === 0) {
    container.innerHTML = `
      <div style="padding: 32px 16px; text-align: center; color: var(--color-muted);">
        <i data-lucide="shield-check" style="width: 28px; height: 28px; margin-bottom: 8px; opacity: 0.5;"></i>
        <div style="font-size: 12px; font-weight: 500; color: var(--color-text);">Belum ada aktivitas hari ini</div>
        <div style="font-size: 11px; margin-top: 4px;">Aktivitas dimulai dari 0 hari ini. Setiap operasi pemindahan, scan AI, atau proteksi berkas akan otomatis muncul di sini.</div>
      </div>
    `;
    initLucide();
    return;
  }

  container.innerHTML = list.map(ev => `
    <div class="timeline-item">
      <div class="timeline-icon-box">
        <i data-lucide="${ev.icon || 'activity'}"></i>
      </div>
      <div class="timeline-content">
        <div class="timeline-title-row">
          <span>${escapeHtml(ev.title || 'Operasi Berkas')}</span>
          <span class="timeline-time">${ev.time || ''}</span>
        </div>
        <div class="timeline-desc">${escapeHtml(ev.desc || '')}</div>
      </div>
    </div>
  `).join('');

  initLucide();
}

function filterTimeline(period) {
  document.querySelectorAll('.timeline-tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  renderTimelineUpdates(period);
}

/* ========================================================
   4. Staging Queue Table (SLA Monitoring & Management)
   ======================================================== */
async function fetchQueue() {
  try {
    const res = await fetch('/api/queue');
    allQueueItems = await res.json();
    renderQueueTable(allQueueItems);
    renderQueueCards(allQueueItems);

    const badge = document.getElementById('sidebarQueueBadge');
    const kpiQueue = document.getElementById('kpiQueueCount');
    const count = allQueueItems.length;

    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
    if (kpiQueue) kpiQueue.textContent = `${count} Pending`;
  } catch (e) {
    console.warn("Fetch queue error:", e);
  }
}

function renderQueueTable(items) {
  const tbody = document.getElementById('queueTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--color-muted);">Tidak ada berkas pending di antrean staging. Semua terorganisir.</td></tr>`;
    return;
  }

  items.forEach(it => {
    const tr = document.createElement('tr');
    const checked = selectedQueueIds.has(it.id) ? 'checked' : '';
    const safety = it.safety || { decision: 'SAFE', reason: 'Berkas dokumen aman.' };
    
    let safetyBadge = '<span class="status-pill success"><i data-lucide="check" style="width: 10px; height: 10px;"></i> Aman</span>';
    let actionBtn = `
      <button class="btn-clean" onclick="executeQueueItem('${it.id}')" style="height: 24px; padding: 0 8px; font-size: 11px;">
        <i data-lucide="arrow-right" style="width: 11px; height: 11px;"></i> Pindahkan
      </button>
    `;

    if (safety.decision === 'PROTECT') {
      safetyBadge = `<span class="status-pill danger" title="${escapeHtml(safety.reason)}"><i data-lucide="shield" style="width: 10px; height: 10px;"></i> Dilindungi AI Decide</span>`;
      actionBtn = `
        <button class="btn-clean" disabled title="${escapeHtml(safety.reason)}" style="height: 24px; padding: 0 8px; font-size: 11px; opacity: 0.5; cursor: not-allowed;">
          <i data-lucide="lock" style="width: 11px; height: 11px;"></i> Dilindungi
        </button>
      `;
    } else if (safety.decision === 'CONFIRM_REQUIRED') {
      safetyBadge = `<span class="status-pill warning" title="${escapeHtml(safety.reason)}"><i data-lucide="alert-triangle" style="width: 10px; height: 10px;"></i> Konfirmasi Ganda</span>`;
      actionBtn = `
        <button class="btn-clean" onclick="executeQueueItem('${it.id}', true)" style="height: 24px; padding: 0 8px; font-size: 11px; color: var(--color-warning);">
          <i data-lucide="alert-circle" style="width: 11px; height: 11px;"></i> Konfirmasi & Pindah
        </button>
      `;
    }

    const targetFolder = it.classification?.target_folder || it.target_subfolder || 'Dokumen Kuliah';
    const targetBase = targetFolder.split(/[/\\]/).pop() || targetFolder;

    tr.innerHTML = `
      <td><input type="checkbox" ${checked} onchange="toggleSelectQueueItem('${it.id}', this.checked)"></td>
      <td><strong>${escapeHtml(it.name)}</strong></td>
      <td><span class="status-pill info">${escapeHtml(targetBase)}</span></td>
      <td class="tabular-nums">${formatBytes(it.size)}</td>
      <td style="font-family: var(--font-mono); font-size: 11px; color: var(--color-muted);">${escapeHtml(it.path || it.source_path || '')}</td>
      <td>${safetyBadge}</td>
      <td style="text-align: right;">${actionBtn}</td>
    `;
    tbody.appendChild(tr);
  });
  initLucide();
}

function renderQueueCards(items) {
  const container = document.getElementById('queueItemsList');
  if (!container) return;
  container.innerHTML = '';

  if (items.length === 0) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; border: 1px dashed var(--color-border); border-radius: var(--radius-inner);">
        <i data-lucide="check-circle-2" style="width: 32px; height: 32px; color: var(--color-success); margin: 0 auto var(--space-2);"></i>
        <h4 style="font-size: 14px; font-weight: 600;">Semua Berkas Sudah Terorganisir</h4>
        <p style="font-size: 12px; color: var(--color-muted); margin-top: 4px;">Watchdog memantau berkas baru di D:\\DOWNLOAD dan OneDrive.</p>
      </div>
    `;
    initLucide();
    return;
  }

  items.forEach(it => {
    const card = document.createElement('div');
    card.style.cssText = "padding: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-inner); background: #ffffff; display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;";
    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 32px; height: 32px; border-radius: 6px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center;">
          <i data-lucide="file-text"></i>
        </div>
        <div>
          <div style="font-weight: 600; font-size: 12.5px;">${escapeHtml(it.name)}</div>
          <div style="font-size: 11px; color: var(--color-muted); display: flex; gap: 8px; margin-top: 2px;">
            <span>${formatBytes(it.size)}</span>
            <span>•</span>
            <span>Tujuan: <strong>${escapeHtml(it.target_subfolder || 'Kuliah')}</strong></span>
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn-clean" onclick="dismissQueueItem('${it.id}')">Lewati</button>
        <button class="btn-clean dark" onclick="executeQueueItem('${it.id}')">
          <i data-lucide="arrow-right"></i> Pindahkan
        </button>
      </div>
    `;
    container.appendChild(card);
  });
  initLucide();
}

function filterQueueTable(q) {
  const query = (q || '').toLowerCase();
  const filtered = allQueueItems.filter(it => it.name.toLowerCase().includes(query) || (it.target_subfolder && it.target_subfolder.toLowerCase().includes(query)));
  renderQueueTable(filtered);
}

function toggleSelectAllQueue(checked) {
  if (checked) {
    allQueueItems.forEach(it => selectedQueueIds.add(it.id));
  } else {
    selectedQueueIds.clear();
  }
  renderQueueTable(allQueueItems);
}

function toggleSelectQueueItem(id, checked) {
  if (checked) selectedQueueIds.add(id);
  else selectedQueueIds.delete(id);
}

function exportQueueCSV() {
  if (allQueueItems.length === 0) {
    showToast("Tidak ada berkas di antrean untuk diexport.");
    return;
  }
  let csv = "ID,Name,Target,Size,SourcePath\n";
  allQueueItems.forEach(it => {
    csv += `"${it.id}","${it.name}","${it.target_subfolder || ''}","${it.size}","${it.source_path}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `queue_export_${Date.now()}.csv`;
  a.click();
  showToast("CSV antrean berhasil diunduh.");
}

async function executeQueueItem(itemId) {
  try {
    await fetch('/api/queue/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId })
    });
    fetchQueue();
    refreshCurrentFolder();
    showToast("Berkas berhasil dipindahkan.");
  } catch (e) {
    showToast(`Gagal: ${e.message}`);
  }
}

async function executeAllQueueWithAI() {
  showToast("Mengeksekusi pemindahan seluruh antrean...");
  try {
    await fetch('/api/queue/execute-all', { method: 'POST' });
    fetchQueue();
    refreshCurrentFolder();
    showToast("Seluruh berkas berhasil diorganisir.");
  } catch (e) {
    showToast(`Gagal: ${e.message}`);
  }
}

async function dismissQueueItem(itemId) {
  try {
    await fetch('/api/queue/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId })
    });
    fetchQueue();
    showToast("Berkas dilewati.");
  } catch (e) {}
}

async function triggerManualScan() {
  showToast("Memindai direktori...");
  try {
    await fetch('/api/queue/scan', { method: 'POST' });
    fetchQueue();
    showToast("Pemindaian selesai.");
  } catch (e) {}
}

/* ========================================================
   5. REDESIGNED SETTINGS (Model & Multi-Provider Controller)
   ======================================================== */
async function loadSettingsFromServer() {
  try {
    const res = await fetch('/api/settings');
    const cfg = await res.json();
    
    activeProvider = cfg.active_provider || 'gemini';
    providersConfig = cfg.providers || {};
    watchPathsList = cfg.watch_paths || ["D:\\DOWNLOAD", "C:\\Users\\fadhl\\OneDrive\\Documents"];
    
    if (cfg.academic_base) basePaths.academic_base = cfg.academic_base;
    if (cfg.personal_base) basePaths.personal_base = cfg.personal_base;
    if (cfg.project_base) basePaths.project_base = cfg.project_base;
    if (cfg.game_base) basePaths.game_base = cfg.game_base;

    // Update Base path inputs
    const baseAcad = document.getElementById('baseAcademicInput');
    const baseProj = document.getElementById('baseProjectInput');
    const baseGame = document.getElementById('baseGameInput');
    if (baseAcad) baseAcad.value = basePaths.academic_base;
    if (baseProj) baseProj.value = basePaths.project_base;
    if (baseGame) baseGame.value = basePaths.game_base;

    // Render Watch Paths table
    renderWatchPathsTable();

    // Load saved custom models
    savedCustomModels = cfg.custom_models || [];
    renderCustomModelsChips();

    // Select active provider card
    selectProviderCard(activeProvider, false);

    // Update active provider pill in header
    const pill = document.getElementById('settingsActiveProviderPill');
    if (pill) pill.textContent = `Active: ${PROVIDER_METADATA[activeProvider]?.name || activeProvider}`;

    // Load and synchronize user models registry (persisted in config.json or localStorage)
    if (cfg.models_registry && Array.isArray(cfg.models_registry) && cfg.models_registry.length > 0) {
      userModelsRegistry = cfg.models_registry;
    } else {
      const localSaved = localStorage.getItem('omnifile_models_registry');
      if (localSaved) {
        try {
          const parsed = JSON.parse(localSaved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            userModelsRegistry = parsed;
          }
        } catch(e){}
      }
    }
    populateModelSelects();
    renderModelsManagementTable();

    initLucide();
  } catch (err) {
    console.warn("Load settings error:", err);
  }
}

function selectProviderCard(provKey, triggerToast = true) {
  activeProvider = provKey;

  // Highlight selected card
  document.querySelectorAll('.provider-select-card').forEach(c => c.classList.remove('active'));
  const card = document.getElementById(`provCard-${provKey}`);
  if (card) card.classList.add('active');

  const meta = PROVIDER_METADATA[provKey] || PROVIDER_METADATA.gemini || {};

  // Update active model for selected provider if available
  const matchModel = userModelsRegistry.find(m => m.provider === provKey);
  if (matchModel) {
    activeModel = matchModel.id;
  }
  populateModelSelects();
  renderModelsManagementTable();
  const customInput = document.getElementById('customModelInput');
  if (customInput) customInput.value = '';

  // Update API Key input
  const keyInput = document.getElementById('settingsApiKeyInput');
  if (keyInput) {
    keyInput.value = providersConfig[provKey]?.api_key || '';
  }

  // Show/hide Endpoint row
  const rowEndpoint = document.getElementById('rowEndpoint');
  const endpointInput = document.getElementById('settingsEndpointInput');
  const btnOllama = document.getElementById('btnFetchOllamaModels');

  if (rowEndpoint) {
    if (meta.needsEndpoint || provKey === 'custom' || provKey === 'ollama') {
      rowEndpoint.style.display = 'flex';
      if (endpointInput) {
        endpointInput.value = providersConfig[provKey]?.endpoint || meta.defaultEndpoint || '';
      }
      if (btnOllama) {
        btnOllama.style.display = (provKey === 'ollama') ? 'inline-flex' : 'none';
      }
    } else {
      rowEndpoint.style.display = 'none';
    }
  }

  // Update status badges on cards
  updateProviderCardBadges();
  refreshChatModelDropdown();

  // Clear previous test results
  hideTestResultBanner();

  if (triggerToast) {
    showToast(`Provider dipilih: ${meta.name}`);
  }
  initLucide();
}

function updateProviderCardBadges() {
  for (const [key, meta] of Object.entries(PROVIDER_METADATA)) {
    const badge = document.getElementById(`badgeProv-${key}`);
    if (!badge) continue;
    const hasKey = Boolean(providersConfig[key]?.api_key);
    if (key === 'local') {
      badge.textContent = "Always Ready";
      badge.style.cssText = "background-color: #ecfdf5; color: #047857;";
    } else if (hasKey) {
      badge.textContent = "Configured";
      badge.style.cssText = "background-color: #ecfdf5; color: #047857;";
    } else {
      badge.textContent = "Missing Key";
      badge.style.cssText = "background-color: #fffbeb; color: #b45309;";
    }
  }
}

function handleModelSelectChange(val) {
  if (!providersConfig[activeProvider]) providersConfig[activeProvider] = {};
  providersConfig[activeProvider].model = val;
  activeModel = val;
  showToast(`Model dipilih: ${val}`);
}

function handleCustomModelInput(val) {
  if (val.trim()) {
    if (!providersConfig[activeProvider]) providersConfig[activeProvider] = {};
    providersConfig[activeProvider].model = val.trim();
    activeModel = val.trim();
  }
}

function toggleApiKeyMask() {
  const input = document.getElementById('settingsApiKeyInput');
  const icon = document.getElementById('iconEyeMask');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) icon.setAttribute('data-lucide', 'eye-off');
  } else {
    input.type = 'password';
    if (icon) icon.setAttribute('data-lucide', 'eye');
  }
  initLucide();
}

async function testCurrentProviderKey() {
  const btn = document.getElementById('btnTestConnection');
  const keyInput = document.getElementById('settingsApiKeyInput');
  const keyVal = keyInput ? keyInput.value.trim() : '';

  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader" style="animation: spin 1s infinite linear;"></i> Menguji...`;
  initLucide();

  try {
    const res = await fetch('/api/settings/test-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: activeProvider,
        api_key: keyVal
      })
    });
    const data = await res.json();
    showTestResultBanner(data.success, data.message);
  } catch (err) {
    showTestResultBanner(false, `Gagal memverifikasi API: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="check-circle-2"></i> Uji Koneksi API`;
    initLucide();
  }
}

function showTestResultBanner(success, msg) {
  const banner = document.getElementById('testResultBanner');
  const text = document.getElementById('testResultText');
  const icon = document.getElementById('testResultIcon');
  if (!banner || !text) return;

  banner.className = `test-connection-result ${success ? 'success' : 'error'}`;
  text.textContent = msg;
  if (icon) {
    icon.setAttribute('data-lucide', success ? 'check-circle' : 'alert-circle');
  }
  initLucide();
}

function hideTestResultBanner() {
  const banner = document.getElementById('testResultBanner');
  if (banner) banner.style.display = 'none';
}

function renderWatchPathsTable() {
  const container = document.getElementById('watchPathsContainer');
  if (!container) return;
  container.innerHTML = '';

  if (watchPathsList.length === 0) {
    container.innerHTML = `<div style="padding: 10px; color: var(--color-muted); font-size: 11.5px;">Tidak ada direktori pemantauan aktif.</div>`;
    return;
  }

  watchPathsList.forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = 'watch-path-row';
    row.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <i data-lucide="folder" style="width: 14px; height: 14px; color: var(--color-muted);"></i>
        <span class="watch-path-text">${escapeHtml(p)}</span>
        <span class="status-pill success" style="font-size: 9.5px;">Monitoring</span>
      </div>
      <button class="btn-clean icon-only" onclick="removeWatchPath(${idx})" title="Hapus direktori pemantauan" style="width: 26px; height: 26px;">
        <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
      </button>
    `;
    container.appendChild(row);
  });
  initLucide();
}

function addNewWatchPath() {
  const input = document.getElementById('newWatchPathInput');
  const val = input ? input.value.trim() : '';
  if (!val) return;
  if (!watchPathsList.includes(val)) {
    watchPathsList.push(val);
    renderWatchPathsTable();
    input.value = '';
    showToast(`Path ditambahkan: ${val}`);
  }
}

function removeWatchPath(idx) {
  const removed = watchPathsList.splice(idx, 1);
  renderWatchPathsTable();
  showToast(`Path dihapus: ${removed}`);
}

async function saveAllSettingsForm() {
  const keyInput = document.getElementById('settingsApiKeyInput');
  const keyVal = keyInput ? keyInput.value.trim() : '';

  if (!providersConfig[activeProvider]) providersConfig[activeProvider] = {};
  providersConfig[activeProvider].name = PROVIDER_METADATA[activeProvider]?.name || activeProvider;
  providersConfig[activeProvider].api_key = keyVal;
  
  const modelSelect = document.getElementById('settingsModelSelect');
  const customInput = document.getElementById('customModelInput');
  if (customInput && customInput.value.trim()) {
    providersConfig[activeProvider].model = customInput.value.trim();
  } else if (modelSelect) {
    providersConfig[activeProvider].model = modelSelect.value;
  }

  // Capture endpoint if visible
  const endpointInput = document.getElementById('settingsEndpointInput');
  if (endpointInput && endpointInput.value.trim()) {
    if (!providersConfig[activeProvider]) providersConfig[activeProvider] = {};
    providersConfig[activeProvider].endpoint = endpointInput.value.trim();
  }

  const payload = {
    active_provider: activeProvider,
    providers: providersConfig,
    watch_paths: watchPathsList,
    academic_base: document.getElementById('baseAcademicInput')?.value.trim() || basePaths.academic_base,
    personal_base: document.getElementById('personal_base')?.value.trim() || basePaths.personal_base,
    project_base: document.getElementById('baseProjectInput')?.value.trim() || basePaths.project_base,
    game_base: document.getElementById('baseGameInput')?.value.trim() || basePaths.game_base,
    custom_models: savedCustomModels
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showToast("Pengaturan berhasil disimpan & diterapkan ke sistem!");
      loadSettingsFromServer();
    }
  } catch (err) {
    showToast(`Gagal menyimpan: ${err.message}`);
  }
}

/* ========================================================
   6. File Explorer View
   ======================================================== */
async function navigatePath(targetPath) {
  if (activeTab !== 'folders') {
    switchNav('folders');
  }
  currentPath = targetPath;
  renderBreadcrumbs(currentPath);

  try {
    const res = await fetch(`/api/browse?path=${encodeURIComponent(targetPath)}`);
    const data = await res.json();

    if (data.error) {
      showToast(`Gagal memuat direktori: ${data.error}`);
      return;
    }

    const items = data.items || [];
    allCurrentFolders = items.filter(it => it.is_dir);
    allCurrentFiles = items.filter(it => !it.is_dir);

    renderFolders(allCurrentFolders);
    renderFiles(allCurrentFiles);

    const filterInput = document.getElementById('filterInput');
    if (filterInput) filterInput.value = '';
  } catch (err) {
    showToast(`Error navigasi: ${err.message}`);
  }
}

function navigateUpFolder() {
  if (currentPath === "D:\\" || currentPath === "D:") return;
  const parts = currentPath.replace(/\\+$/, '').split('\\');
  parts.pop();
  const parent = parts.join('\\') || "D:\\";
  navigatePath(parent.endsWith(':') ? parent + '\\' : parent);
}

function refreshCurrentFolder() {
  navigatePath(currentPath);
  showToast("Direktori dimuat ulang.");
}

function renderBreadcrumbs(pathStr) {
  const strip = document.getElementById('breadcrumbStrip');
  if (!strip) return;
  strip.innerHTML = '';

  const clean = pathStr.replace(/[\\/]+$/, '');
  const parts = clean.split('\\');
  let accumulated = '';

  parts.forEach((part, index) => {
    accumulated += (index === 0 ? part + '\\' : (accumulated.endsWith('\\') ? '' : '\\') + part);
    const thisPath = accumulated;
    const isLast = (index === parts.length - 1);

    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'btn-clean';
    item.style.cssText = `height: 26px; padding: 0 8px; font-size: 11px; ${isLast ? 'font-weight: 600;' : ''}`;
    item.textContent = part;
    if (!isLast) {
      item.onclick = () => navigatePath(thisPath);
    }
    strip.appendChild(item);

    if (!isLast) {
      const sep = document.createElement('span');
      sep.style.color = "var(--color-muted)";
      sep.textContent = "/";
      strip.appendChild(sep);
    }
  });

  // Render @path mention button
  const atPathBtn = document.createElement('button');
  atPathBtn.type = 'button';
  atPathBtn.className = 'btn-clean primary-tone';
  atPathBtn.style.cssText = 'height: 26px; padding: 0 8px; font-size: 11px; font-weight: 600; font-family: var(--font-mono); margin-left: 6px;';
  atPathBtn.innerHTML = `@path`;
  atPathBtn.title = `Sebut path ini ke AI (@path:)`;
  atPathBtn.onclick = () => mentionCurrentPath();
  strip.appendChild(atPathBtn);
}

function renderFolders(folders) {
  const container = document.getElementById('foldersGridContainer');
  const counter = document.getElementById('folderCounterText');
  if (counter) counter.textContent = `${folders.length} spaces / folders`;
  if (!container) return;
  container.innerHTML = '';

  if (folders.length === 0) {
    container.innerHTML = `<div style="grid-column: 1 / -1; padding: 16px; color: var(--color-muted); font-size: 12px;">Tidak ada sub-direktori.</div>`;
    return;
  }

  folders.forEach(f => {
    const isAcademic = f.name.includes('2KA') || f.name.includes('3KA') || f.name.toLowerCase().includes('kuliah');
    const card = document.createElement('div');
    card.className = 'folder-card-clean';
    card.onclick = () => navigatePath(f.path);
    card.innerHTML = `
      <div class="folder-icon-wrap ${isAcademic ? 'academic' : ''}">
        <i data-lucide="${isAcademic ? 'graduation-cap' : 'folder'}"></i>
      </div>
      <div class="folder-card-info">
        <div class="folder-card-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div>
        <div class="folder-card-sub">Folder Direktori</div>
      </div>
      <button type="button" class="folder-card-mention-btn" onclick="event.stopPropagation(); mentionFolderToken('${escapeHtml(f.name)}')" title="Sebut folder ini (@folder:)">
        @folder
      </button>
    `;
    container.appendChild(card);
  });
  initLucide();
}

function renderFiles(files) {
  const list = document.getElementById('filesListContainer');
  if (!list) return;
  list.innerHTML = '';

  if (files.length === 0) {
    list.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--color-muted); font-size: 12.5px;">Tidak ada berkas di direktori ini.</div>`;
    return;
  }

  files.forEach(file => {
    const row = document.createElement('div');
    row.className = 'file-row-clean';
    const safety = file.safety || { decision: 'SAFE' };
    let safetyBadge = '';
    let deleteBtn = `
      <button type="button" class="btn-clean danger-tone icon-only" style="height: 24px; width: 24px;" title="Pindahkan ke Recycle Bin" onclick="confirmDeleteFile('${escapePath(file.path)}', '${escapeHtml(file.name)}')">
        <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
      </button>
    `;

    if (safety.decision === 'PROTECT') {
      safetyBadge = `<span class="status-pill danger" title="${escapeHtml(safety.reason)}" style="font-size: 10px; height: 22px; padding: 0 6px;"><i data-lucide="shield" style="width: 10px; height: 10px;"></i> Dilindungi (AI Decide)</span>`;
      deleteBtn = `
        <button type="button" class="btn-clean icon-only" disabled title="Dilarang: Aset proyek dilindungi oleh AI Decide" style="height: 24px; width: 24px; opacity: 0.35; cursor: not-allowed;">
          <i data-lucide="lock" style="width: 12px; height: 12px;"></i>
        </button>
      `;
    } else if (safety.decision === 'CONFIRM_REQUIRED') {
      safetyBadge = `<span class="status-pill warning" title="${escapeHtml(safety.reason)}" style="font-size: 10px; height: 22px; padding: 0 6px;"><i data-lucide="alert-triangle" style="width: 10px; height: 10px;"></i> Konfirmasi Ganda</span>`;
      deleteBtn = `
        <button type="button" class="btn-clean danger-tone icon-only" style="height: 24px; width: 24px;" title="Berkas Sensitif: Butuh Konfirmasi Ganda" onclick="confirmDeleteFile('${escapePath(file.path)}', '${escapeHtml(file.name)}', true)">
          <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
        </button>
      `;
    }

    row.innerHTML = `
      <div class="file-row-left">
        <i data-lucide="file-text" style="width: 16px; height: 16px; color: var(--color-muted);"></i>
        <div>
          <div style="font-weight: 500; font-size: 12.5px;">${escapeHtml(file.name)}</div>
          <div style="font-size: 11px; color: var(--color-muted);">${formatBytes(file.size)}</div>
        </div>
      </div>
      <div class="file-row-actions">
        ${safetyBadge}
        <button type="button" class="btn-clean primary-tone" style="height: 24px; padding: 0 6px; font-size: 10.5px; font-family: var(--font-mono);" onclick="event.stopPropagation(); mentionFileToken('${escapeHtml(file.name)}')">
          @file
        </button>
        <button type="button" class="btn-clean" style="height: 24px; padding: 0 6px; font-size: 11px;" onclick="openFilePreview('${escapePath(file.path)}')">
          Baca
        </button>
        ${deleteBtn}
      </div>
    `;
    list.appendChild(row);
  });
  initLucide();
}

function filterCurrentView(q) {
  const query = (q || '').toLowerCase();
  const fFolders = allCurrentFolders.filter(f => f.name.toLowerCase().includes(query));
  const fFiles = allCurrentFiles.filter(f => f.name.toLowerCase().includes(query));
  renderFolders(fFolders);
  renderFiles(fFiles);
}

function openInExplorer() {
  fetch('/api/crud/open-explorer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: currentPath })
  });
  showToast("Membuka Windows Explorer...");
}

async function openFilePreview(path) {
  try {
    const res = await fetch(`/api/file/preview?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    const dlg = document.getElementById('previewModalDialog');
    const title = document.getElementById('modalFileName');
    const body = document.getElementById('modalFileBody');

    if (title) title.textContent = data.metadata?.name || 'Preview Berkas';
    if (body) {
      body.innerHTML = `
        <div style="font-size: 11.5px; color: var(--color-muted); margin-bottom: 12px;">
          Ukuran: ${formatBytes(data.metadata?.size)} • Path: <code>${escapeHtml(data.metadata?.path || path)}</code>
        </div>
        <div style="background: #fafafa; border: 1px solid var(--color-border); border-radius: 6px; padding: 12px; font-family: var(--font-mono); font-size: 11.5px; white-space: pre-wrap; max-height: 320px; overflow-y: auto;">
          ${escapeHtml(data.content_preview || '(Tidak ada konten teks yang dapat diekstrak)')}
        </div>
      `;
    }
    if (dlg) dlg.showModal();
  } catch (e) {
    showToast(`Gagal membaca preview: ${e.message}`);
  }
}

async function confirmDeleteFile(path, name) {
  if (confirm(`Pindahkan '${name}' ke Recycle Bin?`)) {
    try {
      await fetch('/api/crud/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: path })
      });
      refreshCurrentFolder();
      showToast(`'${name}' dipindahkan ke Recycle Bin.`);
    } catch (e) {
      showToast(`Gagal menghapus: ${e.message}`);
    }
  }
}

function openNewFolderModal() {
  const name = prompt("Nama folder baru:");
  if (name && name.trim()) {
    fetch('/api/crud/create-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent_path: currentPath, folder_name: name.trim() })
    }).then(() => {
      refreshCurrentFolder();
      showToast(`Folder '${name}' dibuat.`);
    });
  }
}

/* ========================================================
   7. Autonomous AI Assistant & Mention System
   ======================================================== */
function changeActiveModel(modelVal) {
  activeModel = modelVal;
  showToast(`Model aktif: ${modelVal}`);
}

function clearChatHistory() {
  const box = document.getElementById('chatHistoryBox');
  if (box) {
    box.innerHTML = `
      <div class="chat-bubble-ai">
        Riwayat obrolan dibersihkan. Halo! Saya adalah Autonomous File Manager Agent Anda. Silakan ketik perintah atau pertanyaan Anda.
      </div>
    `;
  }
  showToast("Riwayat obrolan dibersihkan.");
}

function sendQuickPrompt(promptText) {
  const input = document.getElementById('chatInput');
  if (input) {
    input.value = promptText;
    handleChatSubmit(new Event('submit'));
  }
}

async function handleChatSubmit(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const input = document.getElementById('chatInput');
  const text = input ? input.value.trim() : '';
  if (!text) return;

  const fullMessage = text;
  const box = document.getElementById('chatHistoryBox');

  // Render User Message with Mention Tags
  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble-user';
  userBubble.innerHTML = formatMentionTagsInMessage(fullMessage);
  box.appendChild(userBubble);

  // Live thinking indicator with animated pulse & cycling phases
  const aiBubble = document.createElement('div');
  aiBubble.className = 'chat-bubble-ai';
  aiBubble.innerHTML = `
    <div class="agent-thinking-wrapper" id="agentThinkingBox">
      <div class="agent-pulse-pill">
        <span class="agent-pulse-dot"></span>
        <span class="agent-phase-title" id="liveAgentStatus">Menghubungkan ke agen kernel host...</span>
      </div>
      <div class="agent-live-log-strip" id="liveAgentDetail">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
        <span id="liveAgentDetailText">Memeriksa instruksi & path aktif ${escapeHtml(currentPath)}...</span>
      </div>
    </div>
  `;
  box.appendChild(aiBubble);
  box.scrollTop = box.scrollHeight;
  initLucide();

  // Dynamic phase updater during background execution
  const livePhases = [
    { title: "Mengeksekusi observasi PowerShell host...", detail: "Menghitung dan memindai direktori kernel D:\\..." },
    { title: "Menganalisis berkas & struktur silabus...", detail: "Mencocokkan silabus 2KA31 / 3KA31 & ekstensi berkas..." },
    { title: "Memverifikasi integritas filesystem...", detail: "Membaca metadata ukuran dan tanggal berkas..." },
    { title: "Menyusun respons laporan terstruktur & widget visual...", detail: "Mengemas data hasil observasi menjadi format analitis..." }
  ];
  let phaseIdx = 0;
  if (liveAgentPhaseTimer) clearInterval(liveAgentPhaseTimer);
  liveAgentPhaseTimer = setInterval(() => {
    phaseIdx = (phaseIdx + 1) % livePhases.length;
    const stTitle = document.getElementById('liveAgentStatus');
    const stDetail = document.getElementById('liveAgentDetailText');
    if (stTitle) stTitle.textContent = livePhases[phaseIdx].title;
    if (stDetail) stDetail.textContent = livePhases[phaseIdx].detail;
  }, 1300);

  // Clear input & close popup
  input.value = '';
  closeMentionPopup();

  // Record user turn in dialogue history
  chatHistoryTurns.push({ role: 'user', content: fullMessage });

  // Extract mention tokens
  const mentionMatches = fullMessage.match(/@(file|folder|path):(?:"([^"]+)"|([^\s,]+))/gi) || [];
  const submittedMentions = mentionMatches.map(m => m.trim());

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: fullMessage,
        current_path: currentPath,
        mentioned_items: submittedMentions,
        model_override: activeModel,
        provider_override: (userModelsRegistry.find(m => m.id === activeModel) || {}).provider || activeProvider,
        history: chatHistoryTurns.slice(-8)
      })
    });
    const data = await res.json();
    if (liveAgentPhaseTimer) { clearInterval(liveAgentPhaseTimer); liveAgentPhaseTimer = null; }

    let bubbleContent = '';

    // 1. Render accordion if any events took place
    if (data.events && data.events.length > 0) {
      bubbleContent += renderAgentEventAccordion(data.events);
    }

    // 2. Prepare markdown content & custom widgets
    const finalMd = data.reply || "Tugas selesai.";
    chatHistoryTurns.push({ role: 'assistant', content: finalMd });
    let renderedMd = renderMarkdown(finalMd);
    renderedMd = formatMentionTagsInHtml(renderedMd);

    // 3. Setup container and stream smoothly with real-time typewriter effect
    const contentContainer = document.createElement('div');
    contentContainer.className = 'agent-final-content';

    aiBubble.innerHTML = bubbleContent;
    aiBubble.appendChild(contentContainer);

    streamTextToElement(contentContainer, renderedMd, () => {
      initLucide();
    }, box);

    if (data.actions_taken && data.actions_taken.length > 0) {
      refreshCurrentFolder();
      fetchQueue();
      fetchStorageDetails();
    }
  } catch (err) {
    if (liveAgentPhaseTimer) { clearInterval(liveAgentPhaseTimer); liveAgentPhaseTimer = null; }
    aiBubble.innerHTML = `
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin-top: 4px;">
        <div style="display: flex; align-items: center; gap: 8px; color: #991b1b; font-weight: 600; font-size: 13px; margin-bottom: 6px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>Kendala Komunikasi Jaringan / Host (${escapeHtml(err.message)})</span>
        </div>
        <p style="font-size: 11.5px; color: #7f1d1d; margin: 0 0 10px 0; line-height: 1.5;">
          Permintaan ke backend lokal (<code>http://127.0.0.1:8765/api/ai/chat</code>) tidak dapat diselesaikan. Kemungkinan server sedang menjalankan query pencarian berkas besar di disk atau sedang mengalami batasan kuota TPM/RPM pada provider LLM.
        </p>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="custom-ui-action-btn primary" onclick="sendQuickPrompt('${escapeHtml(fullMessage.replace(/'/g, "\\'"))}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            <span>Kirim Ulang Permintaan</span>
          </button>
        </div>
      </div>
    `;
  }
  box.scrollTop = box.scrollHeight;
  initLucide();
}

function renderAgentEventAccordion(events) {
  if (!events || !Array.isArray(events)) return '';
  // Strictly filter out internal finish & thinking control flows
  const realEvents = events.filter(ev => ev.tool && ev.tool !== 'finish' && ev.tool !== 'thinking');
  if (realEvents.length === 0) return '';

  const count = realEvents.length;
  let stepsHtml = '';

  const toolMeta = {
    powershell_exec: { label: 'PowerShell Host', badgeClass: 'ps', icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>` },
    list_directory: { label: 'Daftar Direktori', badgeClass: 'dir', icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>` },
    search_files: { label: 'Pencarian Berkas', badgeClass: 'search', icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>` },
    read_document: { label: 'Ekstraksi Dokumen', badgeClass: 'doc', icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>` },
    safe_move: { label: 'Pemindahan Berkas', badgeClass: 'move', icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>` },
    safe_delete: { label: 'Recycle Bin', badgeClass: 'del', icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>` },
    create_folder: { label: 'Buat Folder', badgeClass: 'folder', icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>` },
    get_course_catalog: { label: 'Silabus Kuliah', badgeClass: 'course', icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>` }
  };

  realEvents.forEach((ev, idx) => {
    const meta = toolMeta[ev.tool] || {
      label: ev.tool,
      badgeClass: 'default',
      icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`
    };

    let cmdSnippet = '';
    if (ev.tool === 'powershell_exec' && ev.args && ev.args.command) {
      cmdSnippet = ev.args.command;
    } else if (ev.tool === 'list_directory' && ev.args && ev.args.path) {
      cmdSnippet = `Get-ChildItem -Path '${ev.args.path}' ${ev.args.recursive ? '-Recurse' : ''}`;
    } else if (ev.args && Object.keys(ev.args).length > 0) {
      cmdSnippet = JSON.stringify(ev.args, null, 2);
    }

    const outputSnippet = (ev.output || '(Selesai tanpa output)').trim();

    stepsHtml += `
      <div class="agent-step-card">
        <div class="step-card-header">
          <span class="step-number-chip">${idx + 1}</span>
          <span class="step-tool-pill ${meta.badgeClass}">
            ${meta.icon}
            <span>${escapeHtml(meta.label)}</span>
          </span>
          <span class="step-thought-text">${escapeHtml(ev.thought || 'Menjalankan operasi host')}</span>
        </div>
        ${cmdSnippet || outputSnippet ? `
          <details class="step-terminal-drawer">
            <summary class="step-terminal-toggle">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              <span>Detail Eksekusi & Terminal Host</span>
            </summary>
            <div class="agent-terminal-box">
              <div class="terminal-box-bar">
                <span class="term-dot red"></span>
                <span class="term-dot yellow"></span>
                <span class="term-dot green"></span>
                <span class="term-title">${escapeHtml(ev.tool)}</span>
              </div>
              <div class="terminal-content">
                ${cmdSnippet ? `<div class="term-cmd"><span class="term-prompt">PS &gt;</span> ${escapeHtml(cmdSnippet)}</div>` : ''}
                <div class="term-out">${escapeHtml(outputSnippet)}</div>
              </div>
            </div>
          </details>
        ` : ''}
      </div>
    `;
  });

  return `
    <details class="agent-modern-accordion">
      <summary class="agent-accordion-header">
        <div class="accordion-header-left">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <span>Riwayat Investigasi Agen (${count} operasi sistem tereksekusi)</span>
        </div>
        <svg class="agent-accordion-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </summary>
      <div class="agent-accordion-body">
        ${stepsHtml}
      </div>
    </details>
  `;
}

// Custom UI Widget & Robust Markdown Engine (With Protected Placeholder Stashing)
function renderMarkdown(raw) {
  if (!raw) return '';
  let text = String(raw);

  // 1. Safeguard against raw JSON leak from ReAct finish tool
  if (text.trim().startsWith('{') && (text.includes('"final_answer"') || text.includes('"action": "finish"'))) {
    try {
      const parsed = JSON.parse(text);
      if (parsed.args && parsed.args.final_answer) {
        text = parsed.args.final_answer;
      } else if (parsed.final_answer) {
        text = parsed.final_answer;
      } else if (parsed.thought) {
        text = parsed.thought;
      }
    } catch (e) {
      const mFa = text.match(/"final_answer"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (mFa) {
        try { text = JSON.parse(`"${mFa[1]}"`); } catch (e2) { text = mFa[1]; }
      }
    }
  }

  // 2. Auto-detect lists of academic/directory files and transform into :::file-tree
  text = autoEnhanceFileListToTree(text);

  // 3. Stashed Widgets Storage (protects HTML from marked.js)
  const stashedWidgets = {};
  let widgetCounter = 0;
  function stashWidget(html) {
    const token = `@@@OMNI_WIDGET_${widgetCounter++}@@@`;
    stashedWidgets[token] = html.trim();
    return `\n\n${token}\n\n`;
  }

  // Stash :::action-btn widget (Semantic interactive buttons)
  text = text.replace(/:::action-btn\s*([\s\S]*?)\s*:::/gi, (match, body) => {
    return stashWidget(renderCustomActionButtonsFromText(body));
  });

  // Stash :::stats-grid widget
  text = text.replace(/:::stats-grid\s*([\s\S]*?)\s*:::/gi, (match, body) => {
    return stashWidget(renderCustomStatsGridFromText(body));
  });

  // Stash :::file-tree widget
  text = text.replace(/:::file-tree\s*([\s\S]*?)\s*:::/gi, (match, body) => {
    return stashWidget(renderCustomFileTreeFromText(body));
  });

  // Also stash any pre-existing custom-ui HTML blocks so marked never touches them
  text = text.replace(/<div class="custom-ui-[\s\S]*?<\/div>\s*<\/div>/gi, (match) => {
    return stashWidget(match);
  });

  // 4. Marked.js Markdown Parsing
  let html = '';
  if (typeof marked !== 'undefined' && marked.parse) {
    try {
      html = marked.parse(text);
    } catch (e) {
      html = escapeHtml(text).replace(/\n/g, '<br>');
    }
  } else {
    html = escapeHtml(text).replace(/\n/g, '<br>');
  }

  // 5. Enhance real code blocks with container, language header & copy button
  html = html.replace(/<pre><code(?: class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/gi, (match, lang, codeContent) => {
    const l = lang ? lang.toUpperCase() : 'CODE';
    return `
      <div class="code-block-container">
        <div class="code-block-header">
          <span>${escapeHtml(l)}</span>
          <button type="button" class="btn-copy-code" onclick="copyCodeBlock(this)">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Salin</span>
          </button>
        </div>
        <pre><code class="${lang ? 'language-' + lang : ''}">${codeContent}</code></pre>
      </div>
    `;
  });

  // 6. Restore stashed widgets (replaces tokens even if marked wrapped them in <p>)
  for (const [token, widgetHtml] of Object.entries(stashedWidgets)) {
    const pWrapped = new RegExp(`<p>\\s*${token}\\s*<\\/p>`, 'gi');
    html = html.replace(pWrapped, widgetHtml);
    html = html.replace(new RegExp(token, 'g'), widgetHtml);
  }

  return html;
}

// Compact Stats Grid Builder with Zero Indentation
function renderCustomStatsGridFromText(body) {
  const cards = [];
  const lines = body.trim().split('\n');
  lines.forEach(l => {
    const parts = l.split('|').map(s => s.trim());
    if (parts.length >= 2) {
      const label = escapeHtml(parts[0]);
      const val = escapeHtml(parts[1]);
      const meta = parts[2] ? escapeHtml(parts[2]) : '';
      const color = parts[3] ? escapeHtml(parts[3]) : 'var(--color-accent)';
      cards.push(`<div class="custom-ui-metric-card"><div class="metric-card-label">${label}</div><div class="metric-card-value" style="color: ${color};">${val}</div><div class="metric-card-bar"><div class="metric-bar-fill" style="width: 100%; background-color: ${color};"></div></div>${meta ? `<div class="metric-card-meta">${meta}</div>` : ''}</div>`);
    }
  });
  return `<div class="custom-ui-metric-grid">${cards.join('')}</div>`;
}

// Interactive Hierarchical File Tree Renderer with Non-Truncated Names & Action Menus
function renderCustomFileTreeFromText(body) {
  const lines = body.trim().split('\n');
  const stack = [{ indent: -1, fullPath: currentPath, children: [] }];
  let fileCount = 0;

  lines.forEach(line => {
    if (!line.trim()) return;
    const indent = line.length - line.trimStart().length;
    const s = line.trim();

    const isDir = s.startsWith('[DIR]');
    let name = '';
    let size = '';

    if (isDir) {
      name = s.slice(5).trim();
    } else {
      let finfo = s.startsWith('[FILE]') ? s.slice(6).trim() : s.replace(/^[-*]\s*/, '').trim();
      let parts = finfo.split('|');
      name = parts[0].trim();
      size = parts[1] ? parts[1].trim() : '';
      fileCount++;
    }

    // Pop stack until parent has smaller indent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];
    let fullPath = '';
    if (name.includes(':\\') || name.startsWith('\\\\')) {
      fullPath = name;
    } else {
      const parentP = parent.fullPath || currentPath;
      fullPath = parentP ? (parentP.endsWith('\\') ? parentP + name : parentP + '\\' + name) : name;
    }

    const node = { indent, isDir, name, size, fullPath, children: [] };
    parent.children.push(node);
    if (isDir) {
      stack.push(node);
    }
  });

  function countDescendants(node) {
    let count = 0;
    node.children.forEach(ch => {
      if (ch.isDir) count += countDescendants(ch);
      else count++;
    });
    return count;
  }

  function renderTreeNodes(nodes, depth) {
    let out = '';
    nodes.forEach(node => {
      if (node.isDir) {
        const subCount = countDescendants(node);
        out += `<div class="tree-folder-group" data-open="true">` +
               `<div class="tree-folder-title">` +
               `<svg class="tree-chevron" onclick="toggleTreeGroup(this.parentElement)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transform: rotate(90deg); transition: transform 0.15s ease;"><polyline points="9 18 15 12 9 6"/></svg>` +
               `<svg onclick="toggleTreeGroup(this.parentElement)" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>` +
               `<span onclick="toggleTreeGroup(this.parentElement)" style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(node.name)}">${escapeHtml(node.name)}</span>` +
               `<span style="font-size: 10px; color: var(--color-muted); margin-left: 4px; margin-right: 6px; flex-shrink: 0;">(${subCount} berkas)</span>` +
               `<div class="tree-item-actions">` +
               `<button type="button" class="btn-tree-action" onclick="treeActionMention(this)" data-type="folder" data-name="${escapeHtml(node.name)}" data-path="${escapeHtml(node.fullPath)}" title="Tandai target mention @folder">@</button>` +
               `<button type="button" class="btn-tree-menu" onclick="openTreeContextMenu(this, event)" data-type="folder" data-name="${escapeHtml(node.name)}" data-path="${escapeHtml(node.fullPath)}" title="Menu opsi folder"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg></button>` +
               `</div>` +
               `</div>` +
               `<div class="tree-folder-children" style="display: block;">` +
               renderTreeNodes(node.children, depth + 1) +
               `</div></div>`;
      } else {
        let ext = node.name.includes('.') ? node.name.split('.').pop().toLowerCase() : 'file';
        let badgeClass = ['xlsx', 'pdf', 'docx', 'py', 'zip', 'txt'].includes(ext) ? ext : 'other';
        out += `<div class="tree-file-item" data-path="${escapeHtml(node.fullPath)}" data-name="${escapeHtml(node.name)}">` +
               `<span class="file-ext-badge ${badgeClass}">${escapeHtml(ext)}</span>` +
               `<span class="file-name" title="${escapeHtml(node.name)}">${escapeHtml(node.name)}</span>` +
               (node.size ? `<span class="file-size">${escapeHtml(node.size)}</span>` : '') +
               `<div class="tree-item-actions">` +
               `<button type="button" class="btn-tree-action" onclick="treeActionMention(this)" data-type="file" data-name="${escapeHtml(node.name)}" data-path="${escapeHtml(node.fullPath)}" title="Tandai target mention @file">@</button>` +
               `<button type="button" class="btn-tree-action" onclick="treeActionCopy(this)" data-path="${escapeHtml(node.fullPath)}" data-name="${escapeHtml(node.name)}" title="Salin nama/path"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>` +
               `<button type="button" class="btn-tree-menu" onclick="openTreeContextMenu(this, event)" data-type="file" data-name="${escapeHtml(node.name)}" data-path="${escapeHtml(node.fullPath)}" title="Menu opsi berkas"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg></button>` +
               `</div></div>`;
      }
    });
    return out;
  }

  const rootChildrenHtml = renderTreeNodes(stack[0].children, 0);
  return `<div class="custom-ui-tree"><div class="custom-ui-tree-header"><div class="tree-header-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg><span>Struktur Direktori Berkas</span></div><span class="tree-count-badge">${fileCount} berkas ditampilkan</span></div><div class="custom-ui-tree-body">${rootChildrenHtml}</div></div>`;
}

function toggleTreeGroup(headerEl) {
  const group = headerEl.closest('.tree-folder-group');
  if (!group) return;
  const children = group.querySelector(':scope > .tree-folder-children');
  const chevron = headerEl.querySelector('.tree-chevron');
  const isOpen = group.getAttribute('data-open') !== 'false';

  if (isOpen) {
    group.setAttribute('data-open', 'false');
    if (children) children.style.display = 'none';
    if (chevron) chevron.style.transform = 'rotate(0deg)';
  } else {
    group.setAttribute('data-open', 'true');
    if (children) children.style.display = 'block';
    if (chevron) chevron.style.transform = 'rotate(90deg)';
  }
}


// Auto enhance file bullet lists to tree
function autoEnhanceFileListToTree(text) {
  if (text.includes(':::file-tree')) return text;

  const fileExts = ['\\.docx', '\\.xlsx', '\\.pdf', '\\.py', '\\.zip', '\\.pptx', '\\.txt', '\\.java', '\\.rar'];
  const extRegex = new RegExp(`(?:${fileExts.join('|')})`, 'i');
  
  const lines = text.split('\n');
  let matchingLines = 0;
  lines.forEach(l => {
    if (/^\s*[-*]\s+/.test(l) && extRegex.test(l)) {
      matchingLines++;
    }
  });

  if (matchingLines >= 3) {
    let inList = false;
    let listBuffer = [];
    const newLines = [];

    lines.forEach(l => {
      const isBullet = /^\s*[-*]\s+/.test(l);
      if (isBullet && (extRegex.test(l) || !l.includes('.'))) {
        inList = true;
        const indent = l.length - l.trimStart().length;
        const rawItem = l.replace(/^\s*[-*]\s+/, '').trim();
        const indentStr = ' '.repeat(indent);
        if (extRegex.test(rawItem)) {
          listBuffer.push(`${indentStr}[FILE] ${rawItem}`);
        } else {
          listBuffer.push(`${indentStr}[DIR] ${rawItem}`);
        }
      } else {
        if (inList && listBuffer.length >= 3) {
          newLines.push(':::file-tree\n' + listBuffer.join('\n') + '\n:::');
          listBuffer = [];
          inList = false;
        } else if (inList) {
          newLines.push(...listBuffer.map(b => b.replace(/\[DIR\]|\[FILE\]/g, '-')));
          listBuffer = [];
          inList = false;
        }
        newLines.push(l);
      }
    });

    if (inList && listBuffer.length >= 3) {
      newLines.push(':::file-tree\n' + listBuffer.join('\n') + '\n:::');
    } else if (inList) {
      newLines.push(...listBuffer.map(b => b.replace(/\[DIR\]|\[FILE\]/g, '-')));
    }

    return newLines.join('\n');
  }

  return text;
}

/* ========================================================
   8. Mention Helpers (@file:, @folder:, @path:)
   ======================================================== */
function insertMentionPrefix(type) {
  const input = document.getElementById('chatInput');
  if (!input) return;
  switchNav('home');

  const token = `@${type}:`;
  const cursor = input.selectionStart !== null ? input.selectionStart : input.value.length;
  const val = input.value;

  const needsSpace = cursor > 0 && !/\s$/.test(val.slice(0, cursor));
  const prefix = (needsSpace ? ' ' : '') + token;

  input.value = val.slice(0, cursor) + prefix + val.slice(cursor);
  const newPos = cursor + prefix.length;
  input.setSelectionRange(newPos, newPos);
  input.focus();

  showMentionPopup(type, '');
}

function mentionCurrentPath() {
  insertTokenIntoChat(`@path:"${currentPath}" `);
  showToast(`Path @path:"${currentPath}" ditambahkan.`);
}

function mentionFolderToken(folderName) {
  const safe = folderName.includes(' ') ? `"${folderName}"` : folderName;
  insertTokenIntoChat(`@folder:${safe} `);
  showToast(`Folder @folder:${safe} ditambahkan.`);
}

function mentionFileToken(fileName) {
  const safe = fileName.includes(' ') ? `"${fileName}"` : fileName;
  insertTokenIntoChat(`@file:${safe} `);
  showToast(`Berkas @file:${safe} ditambahkan.`);
}

function insertTokenIntoChat(tokenStr) {
  const input = document.getElementById('chatInput');
  if (!input) return;
  switchNav('home');

  const cursor = input.selectionStart !== null ? input.selectionStart : input.value.length;
  const val = input.value;
  const needsSpace = cursor > 0 && !/\s$/.test(val.slice(0, cursor));
  const toInsert = (needsSpace ? ' ' : '') + tokenStr;

  input.value = val.slice(0, cursor) + toInsert + val.slice(cursor);
  const newPos = cursor + toInsert.length;
  input.setSelectionRange(newPos, newPos);
  input.focus();
}

function setupMentionListeners() {
  const input = document.getElementById('chatInput');
  if (!input) return;

  input.addEventListener('input', () => {
    const val = input.value;
    const cursor = input.selectionStart;
    const textBefore = val.slice(0, cursor);

    const typedMatch = textBefore.match(/(?:^|\s)@(file|folder|path):(?:"([^"]*)"?|([^\s]*))$/i);
    if (typedMatch) {
      const mtype = typedMatch[1].toLowerCase();
      const query = typedMatch[2] !== undefined ? typedMatch[2] : (typedMatch[3] || '');
      showMentionPopup(mtype, query);
      return;
    }

    const generalMatch = textBefore.match(/(?:^|\s)@([a-z0-9_]*)$/i);
    if (generalMatch) {
      const partial = generalMatch[1].toLowerCase();
      if (partial.startsWith('fi')) showMentionPopup('file', '');
      else if (partial.startsWith('fo')) showMentionPopup('folder', '');
      else if (partial.startsWith('pa')) showMentionPopup('path', '');
      else showMentionPopup('category', partial);
      return;
    }

    closeMentionPopup();
  });

  input.addEventListener('keydown', (e) => {
    const popup = document.getElementById('mentionPopup');
    if (!popup || popup.style.display !== 'block') return;

    if (e.key === 'Escape') closeMentionPopup();
  });

  document.addEventListener('click', (e) => {
    const popup = document.getElementById('mentionPopup');
    const trigger = e.target.closest('.btn-mention-trigger, .mention-pill-btn, .mention-popup');
    if (!trigger && popup && popup.style.display === 'block') {
      closeMentionPopup();
    }
  });
}

function toggleMentionPopup() {
  const popup = document.getElementById('mentionPopup');
  if (!popup) return;
  if (popup.style.display === 'block') closeMentionPopup();
  else showMentionPopup('category', '');
}

function closeMentionPopup() {
  const popup = document.getElementById('mentionPopup');
  if (popup) popup.style.display = 'none';
}

function showMentionPopup(mode, query) {
  const popup = document.getElementById('mentionPopup');
  const header = document.getElementById('mentionPopupHeader');
  const list = document.getElementById('mentionPopupList');
  if (!popup || !list) return;

  const q = (query || '').toLowerCase().trim();
  list.innerHTML = '';

  if (mode === 'category') {
    if (header) header.textContent = 'Pilih Kategori Mention Target (@)';
    const categories = [
      { type: 'file', label: '@file:', desc: 'Sebut berkas spesifik (PDF, DOCX, TXT, kode)', icon: 'file-text', color: '#2563EB' },
      { type: 'folder', label: '@folder:', desc: 'Sebut folder atau semester (3KA31, 2KA31, dll)', icon: 'folder', color: '#D97706' },
      { type: 'path', label: '@path:', desc: 'Sebut path direktori host lengkap (D:\\, OneDrive, dll)', icon: 'hard-drive', color: '#059669' }
    ];

    const filtered = categories.filter(c => c.label.toLowerCase().includes(q) || c.type.includes(q));
    filtered.forEach(cat => {
      const item = document.createElement('div');
      item.className = 'mention-item';
      item.onclick = () => insertMentionPrefix(cat.type);
      item.innerHTML = `
        <i data-lucide="${cat.icon}" style="color: ${cat.color};"></i>
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 600; font-family: var(--font-mono); font-size: 11.5px; color: ${cat.color};">${cat.label}</div>
          <div style="font-size: 10.5px; color: var(--color-muted);">${cat.desc}</div>
        </div>
        <span class="mention-item-badge ${cat.type}">PILIH</span>
      `;
      list.appendChild(item);
    });
  } else if (mode === 'file') {
    if (header) header.textContent = 'Pilih Berkas Target (@file:)';
    let candidates = [...allCurrentFiles.map(f => ({ name: f.name, size: formatBytes(f.size) }))];
    if (q) candidates = candidates.filter(c => c.name.toLowerCase().includes(q));

    if (candidates.length === 0) {
      list.innerHTML = `<div style="padding: 10px; font-size: 11px; color: var(--color-muted);">Tidak ada berkas cocok dengan "${escapeHtml(q)}"</div>`;
    } else {
      candidates.slice(0, 15).forEach(c => {
        const item = document.createElement('div');
        item.className = 'mention-item';
        item.onclick = () => selectMentionValue('file', c.name);
        item.innerHTML = `
          <i data-lucide="file-text" style="color: #2563eb;"></i>
          <span class="mention-item-name">${escapeHtml(c.name)}</span>
          <span class="mention-item-badge file">${c.size}</span>
        `;
        list.appendChild(item);
      });
    }
  } else if (mode === 'folder') {
    if (header) header.textContent = 'Pilih Folder / Ruang Kerja (@folder:)';
    let candidates = [
      { name: "3KA31", desc: "D:\\Kuliah\\3KA31" },
      { name: "2KA31", desc: "D:\\Kuliah\\2KA31" },
      { name: "Kuliah", desc: "D:\\Kuliah" },
      { name: "DOWNLOAD", desc: "D:\\DOWNLOAD" },
      { name: "PROJECT", desc: "D:\\PROJECT" },
      { name: "Game", desc: "D:\\Game" },
      { name: "OneDrive Documents", desc: "C:\\Users\\fadhl\\OneDrive\\Documents" },
      ...allCurrentFolders.map(f => ({ name: f.name, desc: f.path }))
    ];

    const seen = new Set();
    candidates = candidates.filter(c => {
      if (seen.has(c.name.toLowerCase())) return false;
      seen.add(c.name.toLowerCase());
      return true;
    });

    if (q) candidates = candidates.filter(c => c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));

    if (candidates.length === 0) {
      list.innerHTML = `<div style="padding: 10px; font-size: 11px; color: var(--color-muted);">Tidak ada folder cocok</div>`;
    } else {
      candidates.slice(0, 15).forEach(c => {
        const item = document.createElement('div');
        item.className = 'mention-item';
        item.onclick = () => selectMentionValue('folder', c.name);
        item.innerHTML = `
          <i data-lucide="folder" style="color: #d97706;"></i>
          <span class="mention-item-name">${escapeHtml(c.name)}</span>
          <span class="mention-item-badge folder">Folder</span>
        `;
        list.appendChild(item);
      });
    }
  } else if (mode === 'path') {
    if (header) header.textContent = 'Pilih Path Direktori Lengkap (@path:)';
    let candidates = [
      { path: currentPath, label: "Path Saat Ini: " + currentPath },
      { path: "D:\\", label: "Root Drive D:\\" },
      { path: "D:\\Kuliah", label: "D:\\Kuliah" },
      { path: "D:\\Kuliah\\3KA31", label: "D:\\Kuliah\\3KA31" },
      { path: "D:\\Kuliah\\2KA31", label: "D:\\Kuliah\\2KA31" },
      { path: "D:\\DOWNLOAD", label: "D:\\DOWNLOAD" },
      { path: "D:\\PROJECT", label: "D:\\PROJECT" },
      { path: "D:\\Game", label: "D:\\Game" },
      { path: "C:\\Users\\fadhl\\OneDrive\\Documents", label: "OneDrive Documents" }
    ];

    if (q) candidates = candidates.filter(c => c.path.toLowerCase().includes(q) || c.label.toLowerCase().includes(q));

    candidates.forEach(c => {
      const item = document.createElement('div');
      item.className = 'mention-item';
      item.onclick = () => selectMentionValue('path', c.path);
      item.innerHTML = `
        <i data-lucide="hard-drive" style="color: #059669;"></i>
        <span class="mention-item-name">${escapeHtml(c.path)}</span>
        <span class="mention-item-badge path">Path</span>
      `;
      list.appendChild(item);
    });
  }

  popup.style.display = 'block';
  initLucide();
}

function selectMentionValue(type, rawVal) {
  const input = document.getElementById('chatInput');
  if (!input) return;

  const safeVal = rawVal.includes(' ') ? `"${rawVal}"` : rawVal;
  const token = `@${type}:${safeVal} `;

  const val = input.value;
  const cursor = input.selectionStart;
  const textBefore = val.slice(0, cursor);

  const match = textBefore.match(/(?:^|\s)@(file|folder|path)?:?(?:"[^"]*"?|[^\s]*)?$/i);
  if (match) {
    const replaceStart = match.index + (match[0].startsWith(' ') ? 1 : 0);
    input.value = val.slice(0, replaceStart) + token + val.slice(cursor);
    const newPos = replaceStart + token.length;
    input.setSelectionRange(newPos, newPos);
  } else {
    insertTokenIntoChat(token);
  }

  closeMentionPopup();
  input.focus();
  showToast(`Target di-mention: @${type}:${safeVal}`);
}

const MENTION_ICONS = {
  file: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  folder: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>',
  path: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>'
};

function formatMentionTagsInMessage(rawText) {
  if (!rawText) return '';
  let escaped = escapeHtml(rawText);

  // Match @(file|folder|path):"val" or @(file|folder|path):&quot;val&quot; or @(file|folder|path):val or just @(file|folder|path):
  const mentionRegex = /@(file|folder|path):(?:(?:&quot;|")([^"&]+)(?:&quot;|")|([^\s,<>&]+))?/gi;

  escaped = escaped.replace(mentionRegex, (match, type, qVal, rawVal) => {
    const t = type.toLowerCase();
    const val = (qVal || rawVal || '').trim();
    const icon = MENTION_ICONS[t] || '';
    const label = val ? val : `@${t}:`;
    const titleAttr = val ? `@${t}:${val}` : `@${t}:`;
    return `<span class="mention-card ${t}" title="${escapeHtml(titleAttr)}">${icon}<span>${escapeHtml(label)}</span></span>`;
  });

  return escaped;
}

function formatMentionTagsInHtml(html) {
  if (!html) return '';
  const mentionRegex = /@(file|folder|path):(?:(?:&quot;|")([^"&]+)(?:&quot;|")|([^\s,<>&]+))?/gi;
  return html.replace(mentionRegex, (match, type, qVal, rawVal) => {
    const t = type.toLowerCase();
    const val = (qVal || rawVal || '').trim();
    const icon = MENTION_ICONS[t] || '';
    const label = val ? val : `@${t}:`;
    const titleAttr = val ? `@${t}:${val}` : `@${t}:`;
    return `<span class="mention-card ${t}" title="${escapeHtml(titleAttr)}">${icon}<span>${escapeHtml(label)}</span></span>`;
  });
}

/* ========================================================
   9. Storage & Telemetry View
   ======================================================== */
async function fetchStorageDetails() {
  try {
    const res = await fetch('/api/storage/details');
    const data = await res.json();
    renderStorageDetails(data);
  } catch (e) {
    console.warn("Storage fetch error:", e);
  }
}

function renderStorageDetails(data) {
  const container = document.getElementById('storageCardsContainer');
  if (!container || !data.drives) return;
  container.innerHTML = '';

  data.drives.forEach(drv => {
    const card = document.createElement('div');
    card.style.cssText = "padding: 16px; border: 1px solid var(--color-border); border-radius: var(--radius-inner); background: #ffffff;";
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
        <strong style="font-size: 14px;">Drive ${escapeHtml(drv.letter)}: (${escapeHtml(drv.fstype || 'NTFS')})</strong>
        <span class="status-pill info">${drv.percent_used}% Digunakan</span>
      </div>
      <div style="height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; margin-bottom: 12px;">
        <div style="height: 100%; width: ${drv.percent_used}%; background: var(--color-accent);"></div>
      </div>
      <div style="font-size: 11.5px; color: var(--color-muted); display: flex; justify-content: space-between;">
        <span>Terpakai: <strong>${drv.used_gb} GB</strong></span>
        <span>Bebas: <strong>${drv.free_gb} GB</strong></span>
        <span>Total: <strong>${drv.total_gb} GB</strong></span>
      </div>
    `;
    container.appendChild(card);
  });
}

/* ========================================================
   10. Utilities & Shortcuts
   ======================================================== */
function setupGlobalShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const input = document.getElementById('globalSearchInput');
      if (input) {
        input.focus();
        input.select();
      }
    }
  });
}

function handleGlobalSearchKey(e) {
  if (e.key === 'Enter') {
    const query = e.target.value.trim();
    if (query) {
      switchNav('folders');
      const filterInput = document.getElementById('filterInput');
      if (filterInput) {
        filterInput.value = query;
        filterCurrentView(query);
      }
    }
  }
}

function showToast(msg) {
  const toast = document.getElementById('appToast');
  const text = document.getElementById('toastMessage');
  if (!toast || !text) return;
  text.textContent = msg;
  toast.style.display = 'flex';
  initLucide();
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapePath(p) {
  if (!p) return '';
  return p.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/* ============================================================ */
/* REAL-TIME TYPEWRITER STREAMER & WIDGET HELPERS              */
/* ============================================================ */
function streamTextToElement(element, fullHtml, onComplete, scrollContainer) {
  element.innerHTML = '<span class="typing-cursor"></span>';
  let isCancelled = false;

  // Add Skip button
  const skipBtn = document.createElement('button');
  skipBtn.className = 'skip-typing-btn';
  skipBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg> Lewati Animasi';
  skipBtn.onclick = () => {
    isCancelled = true;
    skipBtn.remove();
    element.innerHTML = fullHtml;
    if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
    if (onComplete) onComplete();
  };
  element.parentNode.insertBefore(skipBtn, element);

  // Smart Atomic Tokenizer: leaves custom UI widgets intact so DOM tags are never mangled
  const tokens = [];
  const tagRegex = /(<div class="custom-ui-(?:metric-grid|tree|action-group)"[\s\S]*?<\/div>\s*<\/div>|<div class="code-block-container"[\s\S]*?<\/div>|<details class="agent-accordion"[\s\S]*?<\/details>|<[^>]+>|[^<>\s]+|\s+)/g;
  let m;
  while ((m = tagRegex.exec(fullHtml)) !== null) {
    tokens.push(m[0]);
  }

  let idx = 0;
  let currentHtml = '';
  const batchSize = 3;

  function tick() {
    if (isCancelled) return;
    if (idx >= tokens.length) {
      skipBtn.remove();
      element.innerHTML = fullHtml;
      if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
      if (onComplete) onComplete();
      return;
    }

    for (let i = 0; i < batchSize && idx < tokens.length; i++) {
      currentHtml += tokens[idx];
      idx++;
    }

    element.innerHTML = currentHtml + '<span class="typing-cursor"></span>';
    if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;

    setTimeout(tick, 14);
  }

  tick();
}

function copyCodeBlock(btn) {
  const container = btn.closest('.code-block-container');
  const codeEl = container ? container.querySelector('code') : null;
  if (!codeEl) return;

  navigator.clipboard.writeText(codeEl.innerText).then(() => {
    const label = btn.querySelector('span');
    if (label) label.textContent = 'Disalin!';
    setTimeout(() => { if (label) label.textContent = 'Salin'; }, 1800);
  });
}

function copyFilePath(path) {
  navigator.clipboard.writeText(path).then(() => {
    showToast(`Path disalin: ${path}`);
  });
}




/* ============================================================ */
/* UNIFIED MODEL MANAGER: CRUD, DROPDOWN SYNC & PERSISTENCE    */
/* (User freedom: Hapus model yang ada, Tambah baru, Modifikasi)*/
/* ============================================================ */

const PROVIDER_NAMES = {
  gemini: "Google Gemini",
  openrouter: "OpenRouter",
  openai: "OpenAI",
  groq: "Groq (Ultra-Fast)",
  deepseek: "DeepSeek Official",
  ollama: "Ollama (Lokal)",
  custom: "Custom OpenAI-API",
  local: "Agen Mandiri (PowerShell)"
};

function populateModelSelects() {
  const selects = [
    document.getElementById('aiModelSelect'),
    document.getElementById('settingsModelSelect')
  ];

  selects.forEach(sel => {
    if (!sel) return;
    const curVal = activeModel;
    sel.innerHTML = '';

    // Group models by provider
    const groups = {};
    userModelsRegistry.forEach(m => {
      const p = m.provider || 'gemini';
      if (!groups[p]) groups[p] = [];
      groups[p].push(m);
    });

    for (const [prov, models] of Object.entries(groups)) {
      const grp = document.createElement('optgroup');
      grp.label = PROVIDER_NAMES[prov] || prov.toUpperCase();
      models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.label || m.id;
        grp.appendChild(opt);
      });
      sel.appendChild(grp);
    }

    // Add action option
    const optManage = document.createElement('option');
    optManage.value = '__OPEN_MANAGER__';
    optManage.textContent = '⚙ Kelola / Hapus / Tambah Model...';
    sel.appendChild(optManage);

    // Set value
    if (curVal && userModelsRegistry.some(m => m.id === curVal)) {
      sel.value = curVal;
    } else if (userModelsRegistry.length > 0) {
      sel.value = userModelsRegistry[0].id;
      activeModel = userModelsRegistry[0].id;
    }
  });
}

function refreshChatModelDropdown() {
  populateModelSelects();
}

function handleAiModelSelectChange(val) {
  if (val === '__OPEN_MANAGER__') {
    openModelManagerModal();
    populateModelSelects();
    return;
  }
  activeModel = val;
  const found = userModelsRegistry.find(m => m.id === val);
  if (found) {
    showToast(`Model aktif: ${found.label}`);
  }
  renderModelsManagementTable();
}

function handleModelSelectChange(val) {
  handleAiModelSelectChange(val);
}

function renderModelsManagementTable(filterQuery = '') {
  const modalTbody = document.getElementById('modalModelsTableBody');
  const settingsTbody = document.getElementById('settingsModelsTableBody');
  const countBadge = document.getElementById('modalModelCountBadge');

  if (countBadge) {
    countBadge.textContent = `${userModelsRegistry.length} model`;
  }

  const q = (filterQuery || '').toLowerCase().trim();
  const filtered = userModelsRegistry.filter(m => {
    if (!q) return true;
    return (m.id && m.id.toLowerCase().includes(q)) ||
           (m.label && m.label.toLowerCase().includes(q)) ||
           (m.provider && m.provider.toLowerCase().includes(q));
  });

  const renderRows = () => {
    if (filtered.length === 0) {
      return `<tr><td colspan="5" style="text-align: center; color: var(--color-muted); padding: 16px;">Tidak ada model yang cocok.</td></tr>`;
    }
    return filtered.map(m => {
      const isActive = m.id === activeModel;
      const provClass = m.provider || 'gemini';
      const provLabel = PROVIDER_NAMES[m.provider] || m.provider;
      const safeId = escapeHtml(m.id).replace(/'/g, "\\'");
      return `
        <tr style="${isActive ? 'background: #f0fdf4;' : ''}">
          <td>
            <span class="badge-prov-chip ${escapeHtml(provClass)}">${escapeHtml(provLabel)}</span>
          </td>
          <td style="font-weight: 500;">
            ${escapeHtml(m.label || m.id)}
          </td>
          <td>
            <code style="font-family: var(--font-mono); font-size: 11px; color: var(--color-secondary);">${escapeHtml(m.id)}</code>
          </td>
          <td style="text-align: center;">
            ${isActive ? '<span class="status-pill success" style="font-size: 10px; padding: 1px 6px;">Aktif</span>' : '<button type="button" class="btn-clean" style="height: 20px; font-size: 10px; padding: 0 5px;" onclick="setActiveModelFromTable(\'' + safeId + '\')">Pilih</button>'}
          </td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 4px; justify-content: flex-end;">
              <button type="button" class="btn-action-icon" onclick="startEditModel('${safeId}')" title="Ubah nama atau ID model">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                <span>Edit</span>
              </button>
              <button type="button" class="btn-action-icon danger" onclick="deleteModel('${safeId}')" title="Hapus model dari daftar & dropdown">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                <span>Hapus</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  };

  const rowsHtml = renderRows();
  if (modalTbody) modalTbody.innerHTML = rowsHtml;
  if (settingsTbody) settingsTbody.innerHTML = rowsHtml;
}

function setActiveModelFromTable(modelId) {
  activeModel = modelId;
  const found = userModelsRegistry.find(m => m.id === modelId);
  showToast(`Model aktif: ${found ? found.label : modelId}`);
  populateModelSelects();
  renderModelsManagementTable();
}

function openModelManagerModal(modelToEdit = null, mode = 'view') {
  const modal = document.getElementById('modelManagerModal');
  if (modal) modal.style.display = 'flex';
  if (modelToEdit) {
    startEditModel(modelToEdit);
  } else {
    cancelModelEdit();
  }
  renderModelsManagementTable();
  const searchInput = document.getElementById('modalModelSearchInput');
  if (searchInput) searchInput.value = '';
}

function closeModelManagerModal() {
  const modal = document.getElementById('modelManagerModal');
  if (modal) modal.style.display = 'none';
  cancelModelEdit();
}

function startEditModel(modelId) {
  const m = userModelsRegistry.find(x => x.id === modelId);
  if (!m) return;
  editingModelId = modelId;

  const modal = document.getElementById('modelManagerModal');
  if (modal && modal.style.display !== 'flex') {
    modal.style.display = 'flex';
  }

  const provInput = document.getElementById('modalFormProv');
  const idInput = document.getElementById('modalFormId');
  const labelInput = document.getElementById('modalFormLabel');
  const title = document.getElementById('modalModelFormTitle');
  const btnCancel = document.getElementById('btnCancelEditModel');
  const btnSaveLabel = document.getElementById('btnSaveModelLabel');

  if (provInput) provInput.value = m.provider || 'gemini';
  if (idInput) idInput.value = m.id;
  if (labelInput) labelInput.value = m.label || m.id;
  if (title) title.textContent = `Ubah Model: ${m.label || m.id}`;
  if (btnCancel) btnCancel.style.display = 'inline-block';
  if (btnSaveLabel) btnSaveLabel.textContent = 'Simpan Perubahan';

  const card = document.getElementById('modalModelFormCard');
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    card.style.borderColor = 'var(--color-primary)';
  }
}

function cancelModelEdit() {
  editingModelId = null;
  const idInput = document.getElementById('modalFormId');
  const labelInput = document.getElementById('modalFormLabel');
  const title = document.getElementById('modalModelFormTitle');
  const btnCancel = document.getElementById('btnCancelEditModel');
  const btnSaveLabel = document.getElementById('btnSaveModelLabel');

  if (idInput) idInput.value = '';
  if (labelInput) labelInput.value = '';
  if (title) title.textContent = '+ Tambah Model Baru';
  if (btnCancel) btnCancel.style.display = 'none';
  if (btnSaveLabel) btnSaveLabel.textContent = 'Simpan Model';

  const card = document.getElementById('modalModelFormCard');
  if (card) card.style.borderColor = 'var(--color-border)';
}

async function submitModelForm() {
  const provInput = document.getElementById('modalFormProv');
  const idInput = document.getElementById('modalFormId');
  const labelInput = document.getElementById('modalFormLabel');

  const prov = provInput ? provInput.value : 'gemini';
  const id = idInput ? idInput.value.trim() : '';
  const label = labelInput && labelInput.value.trim() ? labelInput.value.trim() : id;

  if (!id) {
    showToast("ID Model teknis tidak boleh kosong!");
    if (idInput) idInput.focus();
    return;
  }

  if (editingModelId) {
    // Updating existing model
    const idx = userModelsRegistry.findIndex(m => m.id === editingModelId);
    if (idx !== -1) {
      userModelsRegistry[idx] = { id, label, provider: prov };
      if (activeModel === editingModelId) {
        activeModel = id;
      }
      showToast(`Model '${label}' berhasil diperbarui!`);
    }
  } else {
    // Adding new model
    const exists = userModelsRegistry.some(m => m.id === id);
    if (exists) {
      showToast(`Model dengan ID '${id}' sudah ada di daftar.`);
      return;
    }
    userModelsRegistry.unshift({ id, label, provider: prov });
    activeModel = id;
    showToast(`Model '${label}' berhasil ditambahkan ke dropdown!`);
  }

  cancelModelEdit();
  await saveModelsRegistry(userModelsRegistry);
}

async function deleteModel(modelId) {
  const m = userModelsRegistry.find(x => x.id === modelId);
  const name = m ? m.label || m.id : modelId;

  if (!confirm(`Hapus model '${name}' dari daftar & dropdown?`)) {
    return;
  }

  userModelsRegistry = userModelsRegistry.filter(x => x.id !== modelId);
  if (activeModel === modelId) {
    activeModel = userModelsRegistry[0]?.id || 'local-heuristic';
  }

  showToast(`Model '${name}' telah dihapus.`);
  await saveModelsRegistry(userModelsRegistry);
}

function resetModelsToDefaultsPrompt() {
  if (confirm("Kembalikan semua daftar model ke preset bawaan sistem? Semua model yang telah dihapus atau ditambahkan akan diatur ulang.")) {
    userModelsRegistry = JSON.parse(JSON.stringify(DEFAULT_MODELS_REGISTRY));
    activeModel = "gemini-3.5-flash-lite";
    saveModelsRegistry(userModelsRegistry);
    showToast("Model berhasil di-reset ke preset bawaan.");
  }
}

async function saveModelsRegistry(models) {
  try {
    localStorage.setItem('omnifile_models_registry', JSON.stringify(models));
    await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ models })
    });
  } catch (err) {
    console.warn("Error saving models to server:", err);
  }
  populateModelSelects();
  renderModelsManagementTable();
}

function addCustomModelToFavorites() {
  const input = document.getElementById('customModelInput');
  const val = input ? input.value.trim() : '';
  if (!val) {
    showToast("Ketik nama model terlebih dahulu.");
    return;
  }
  userModelsRegistry.unshift({
    id: val,
    label: val,
    provider: activeProvider
  });
  activeModel = val;
  saveModelsRegistry(userModelsRegistry);
  showToast(`Model '${val}' ditambahkan ke dropdown.`);
  input.value = '';
}
