# 02. Architecture & Technical Specification — OmniFile AI 🏛️

Dokumen ini memetakan arsitektur perangkat lunak, batasan teknologi (*Technology Stack Boundaries*), struktur direktori, modul-modul sistem, dan pola aliran data untuk **OmniFile AI**.

---

## 🧱 Technology Stack Boundaries

```text
Target Platform : desktop
Bahasa Utama    : JavaScript / TypeScript / Python / Kotlin (sesuai proyek)
Arsitektur UI   : Clean Modular / Vanilla / Component-Driven
Penyimpanan Data: SQLite / Local-First Storage / IndexedDB
Ikonografi      : Google Material Symbols Outlined
Tipografi       : Inter (UI) + JetBrains Mono (Kode / Angka)
```

> ⚠️ **Strict Constraint**: Jangan menambahkan dependency framework pihak ketiga tanpa alasan teknis kuat yang dicatat di `progress.md`.

---

## 🏗️ Diagram Arsitektur Tingkat Tinggi

```text
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                   │
│   (Views / Components / Router / Hallmark Design System) │
└────────────────────────────┬────────────────────────────┘
                             │ Events & Actions
                             ▼
┌─────────────────────────────────────────────────────────┐
│                     APPLICATION / IPC                   │
│      (State Store / Controllers / Validation Layer)     │
└────────────────────────────┬────────────────────────────┘
                             │ Service Calls
                             ▼
┌─────────────────────────────────────────────────────────┐
│                     DOMAIN & SERVICES                   │
│   (Business Logic Engines / Parser / Data Transformers) │
└────────────────────────────┬────────────────────────────┘
                             │ Queries & Persistence
                             ▼
┌─────────────────────────────────────────────────────────┐
│                      STORAGE LAYER                      │
│        (SQLite Database / Storage Repositories / Cache) │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Struktur Direktori Standar

```text
D:/PROJECT/File-manager-organizer-pc-ai/
├── AGENT_NOTICE.md           # Panduan wajib & batasan untuk setiap AI Agent
├── progress.md               # Memori permanen & riwayat pengerjaan sesi
├── README.md                 # Deskripsi proyek & petunjuk navigasi
├── workflows/                # Seluruh spesifikasi arsitektur & modul
│   ├── 00_overview.md
│   ├── 01_requirements.md
│   ├── 02_architecture.md
│   ├── 04_data_models.md
│   ├── 06_ui_design_system.md
│   └── 08_milestones.md
├── src/                      # Kode sumber aplikasi
│   ├── core/                 # Logika bisnis inti murni
│   ├── data/                 # Repositori data & skema
│   ├── services/             # Integrasi layanan & helper
│   └── ui/                   # Komponen tampilan & style
└── tests/                    # Pengujian otomatis
```

---

## 🔄 Pola Aliran Data & Error Handling

1. **Unidirectional Data Flow**: Komponen antarmuka mengirimkan event/aksi ke controller, controller memproses mutasi state melalui repositori data, dan perubahan state disiarkan kembali ke antarmuka.
2. **Standardized Error Object**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Deskripsi kesalahan yang mudah dipahami",
    "details": {}
  }
}
```
3. **Graceful Fallback**: Kegagalan pada satu modul tidak boleh menyebabkan seluruh sistem crash.
