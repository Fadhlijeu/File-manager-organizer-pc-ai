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

// Provider & Models Catalog
const PROVIDER_METADATA = {
  gemini: {
    name: "Google Gemini",
    models: [
      { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite (Cepat & Default)" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Performa Tinggi)" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Penalaran Kompleks)" }
    ],
    defaultModel: "gemini-3.5-flash-lite"
  },
  openrouter: {
    name: "OpenRouter",
    models: [
      { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet (Anthropic)" },
      { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B (Meta)" },
      { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash via OpenRouter" },
      { id: "deepseek/deepseek-chat", label: "DeepSeek V3 (DeepSeek)" }
    ],
    defaultModel: "anthropic/claude-3.5-sonnet"
  },
  openai: {
    name: "OpenAI",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o Mini (Cepat & Hemat)" },
      { id: "gpt-4o", label: "GPT-4o (Flagship Multimodal)" },
      { id: "o3-mini", label: "o3-mini (Reasoning Model)" }
    ],
    defaultModel: "gpt-4o-mini"
  },
  local: {
    name: "Agen Lokal Mandiri",
    models: [
      { id: "local-heuristic", label: "PowerShell Host Agent (Offline & Otomatis)" },
      { id: "ollama/llama3.2", label: "Ollama: Llama 3.2 (Local Host)" },
      { id: "ollama/qwen2.5-coder", label: "Ollama: Qwen 2.5 Coder (Local Host)" }
    ],
    defaultModel: "local-heuristic"
  }
};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
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

    // Select active provider card
    selectProviderCard(activeProvider, false);

    // Update active provider pill in header
    const pill = document.getElementById('settingsActiveProviderPill');
    if (pill) pill.textContent = `Active: ${PROVIDER_METADATA[activeProvider]?.name || activeProvider}`;

    // Update AI Assistant model selector
    const aiModelSelect = document.getElementById('aiModelSelect');
    if (aiModelSelect) {
      const curModel = providersConfig[activeProvider]?.model || PROVIDER_METADATA[activeProvider]?.defaultModel;
      if (curModel) aiModelSelect.value = curModel;
    }

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

  // Update models dropdown
  const modelSelect = document.getElementById('settingsModelSelect');
  const customInput = document.getElementById('customModelInput');
  const meta = PROVIDER_METADATA[provKey] || PROVIDER_METADATA.gemini;
  
  if (modelSelect) {
    modelSelect.innerHTML = meta.models.map(m => `<option value="${m.id}">${m.label}</option>`).join('');
    const curModel = providersConfig[provKey]?.model || meta.defaultModel;
    modelSelect.value = curModel;
  }
  if (customInput) customInput.value = '';

  // Update API Key input
  const keyInput = document.getElementById('settingsApiKeyInput');
  if (keyInput) {
    keyInput.value = providersConfig[provKey]?.api_key || '';
  }

  // Update status badges on cards
  updateProviderCardBadges();

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

  const payload = {
    active_provider: activeProvider,
    providers: providersConfig,
    watch_paths: watchPathsList,
    academic_base: document.getElementById('baseAcademicInput')?.value.trim() || basePaths.academic_base,
    personal_base: document.getElementById('personal_base')?.value.trim() || basePaths.personal_base,
    project_base: document.getElementById('baseProjectInput')?.value.trim() || basePaths.project_base,
    game_base: document.getElementById('baseGameInput')?.value.trim() || basePaths.game_base
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

  // AI placeholder with spinner
  const aiBubble = document.createElement('div');
  aiBubble.className = 'chat-bubble-ai';
  aiBubble.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; color: var(--color-muted);">
      <i data-lucide="loader" style="animation: spin 1s infinite linear; width: 14px; height: 14px;"></i>
      <span>Agen sedang bernalar & mengeksekusi alat sistem...</span>
    </div>
  `;
  box.appendChild(aiBubble);
  box.scrollTop = box.scrollHeight;
  initLucide();

  // Clear input & close popup
  input.value = '';
  closeMentionPopup();

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
        model_override: activeModel
      })
    });
    const data = await res.json();

    let bubbleContent = '';

    // Events timeline accordion
    if (data.events && data.events.length > 0) {
      bubbleContent += renderAgentEventAccordion(data.events);
    }

    // Markdown content
    const finalMd = data.reply || "Tugas selesai.";
    bubbleContent += `<div class="agent-final-content">${renderMarkdown(finalMd)}</div>`;

    aiBubble.innerHTML = bubbleContent;

    if (data.actions_taken && data.actions_taken.length > 0) {
      refreshCurrentFolder();
      fetchQueue();
      fetchStorageDetails();
    }
  } catch (err) {
    aiBubble.innerHTML = `<span style="color: var(--color-danger);">Error komunikasi: ${escapeHtml(err.message)}</span>`;
  }
  box.scrollTop = box.scrollHeight;
  initLucide();
}

function renderAgentEventAccordion(events) {
  const count = events.length;
  let stepsHtml = '';

  events.forEach(ev => {
    const toolArgs = ev.args ? JSON.stringify(ev.args, null, 2) : '';
    stepsHtml += `
      <div style="border-left: 2px solid var(--color-border); padding-left: 10px; margin-bottom: 8px;">
        <div style="font-size: 11.5px; font-weight: 600; color: var(--color-text);">
          Langkah ${ev.step}: ${escapeHtml(ev.thought || 'Investigasi host')}
        </div>
        <div style="margin-top: 3px;">
          <span style="font-family: var(--font-mono); font-size: 10.5px; background: #f1f2f4; padding: 1px 6px; border-radius: 3px;">
            ${escapeHtml(ev.tool || 'powershell_exec')}
          </span>
        </div>
        ${toolArgs ? `<pre style="background: #f8f8f8; padding: 4px 6px; border-radius: 4px; font-size: 10.5px; margin-top: 3px;"><code>${escapeHtml(toolArgs)}</code></pre>` : ''}
        ${ev.output ? `<div style="background: #ffffff; border: 1px solid var(--color-border); padding: 4px 6px; border-radius: 4px; font-size: 10.5px; margin-top: 3px; max-height: 100px; overflow-y: auto;"><strong>Output:</strong><br>${escapeHtml(ev.output)}</div>` : ''}
      </div>
    `;
  });

  return `
    <details style="margin-bottom: 10px; border: 1px solid var(--color-border); border-radius: var(--radius-inner); padding: 6px 10px; background: #ffffff;" open>
      <summary style="font-size: 11.5px; font-weight: 600; color: var(--color-secondary); cursor: pointer;">
        Aktivitas Investigasi Agen (${count} langkah)
      </summary>
      <div style="margin-top: 8px;">
        ${stepsHtml}
      </div>
    </details>
  `;
}

function renderMarkdown(raw) {
  if (!raw) return '';
  if (typeof marked !== 'undefined' && marked.parse) {
    try {
      return marked.parse(raw);
    } catch (e) {}
  }
  return escapeHtml(raw).replace(/\n/g, '<br>');
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

function formatMentionTagsInMessage(rawText) {
  let escaped = escapeHtml(rawText);
  escaped = escaped.replace(/@(file):(?:"([^"]+)"|([^\s,]+))/gi, (match, type, qVal, rawVal) => {
    const val = qVal || rawVal;
    return `<span class="mention-tag file">@file:${val}</span>`;
  });
  escaped = escaped.replace(/@(folder):(?:"([^"]+)"|([^\s,]+))/gi, (match, type, qVal, rawVal) => {
    const val = qVal || rawVal;
    return `<span class="mention-tag folder">@folder:${val}</span>`;
  });
  escaped = escaped.replace(/@(path):(?:"([^"]+)"|([^\s,]+))/gi, (match, type, qVal, rawVal) => {
    const val = qVal || rawVal;
    return `<span class="mention-tag path">@path:${val}</span>`;
  });
  return escaped;
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
