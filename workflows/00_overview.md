# 00. Overview — OmniFile AI 🚀

## 🌟 Vision & Purpose

**OmniFile AI** adalah Autonomous Local File Manager & AI Organizer with Direct Host Access, Safe ReAct Engine, and Anti-Slop UI.

Proyek ini dibangun untuk mengatasi kendala utama pada sistem yang ada:
- **Kerapian & Kestabilan**: Memastikan setiap komponen terisolasi dengan batas tanggung jawab yang jelas.
- **Transparansi & Kontrol Pengguna**: Tidak ada operasi tersembunyi yang destruktif tanpa konfirmasi pengguna.
- **Kinerja Optimal**: Mengutamakan pemrosesan lokal, efisiensi memori, dan latensi rendah.

---

## 🛡️ Core Principles

### 1. Safety & Deterministic Operations
Semua mutasi data dan aksi sistem harus bersifat terprediksi, memiliki validasi ketat sebelum eksekusi, serta menyediakan mekanisme pemulihan (rollback / undo) bila memungkinkan.

```text
INPUT / PERMINTAAN USER
         │
         ▼
  VALIDASI SKEMA & ATURAN
         │
         ▼
  PERHITUNGAN PERUBAHAN (DIFF)
         │
         ▼
  KONFIRMASI / REVIEW (JIKA PERLU)
         │
         ▼
  EKSEKUSI TRANSAKSI ATOMIK
         │
         ▼
  VERIFIKASI & LOGGING PERMANEN
```

### 2. Anti-AI-Slop Design (Hallmark Principles)
Antarmuka visual dirancang dengan keanggunan minimalis, presisi teknis, dan fungsi nyata:
- **Tenang & Bertujuan**: Setiap elemen dan animasi memiliki alasan fungsional yang jelas.
- **Ikonografi Standar**: Menggunakan ikon resmi (Google Material Symbols Outlined), tanpa campuran emoji yang inkonsisten pada kontrol navigasi.
- **Dilarang**: Gradien neon ungu murahan, kartu-kartu dekoratif tanpa isi fungsional, dan floating widget mengganggu.

### 3. Local-First & Privacy Conscious
- Prioritaskan pemrosesan dan penyimpanan data di perangkat lokal (SQLite / IndexedDB / Flat JSON) sebelum bergantung pada jaringan cloud.
- Kredensial, kunci API, dan data sensitif pengguna tidak boleh bocor ke repositori atau logging terbuka.

---

## 🚫 Non-Goals & Boundaries

Hal-hal yang secara sadar **TIDAK** menjadi ruang lingkup proyek ini:
- Bukan sistem serba-bisa tanpa batas: Proyek fokus menyelesaikan satu domain masalah dengan sangat matang (*do one thing exceptionally well*).
- Tidak menggunakan dependency berlebih jika implementasi native sudah memadai.
- Tidak mengeksekusi aksi destruktif tanpa persetujuan eksplisit dari pengguna.

---

## 🗺️ Dokumen dalam Folder `workflows/`

| Berkas | Deskripsi Isi |
|--------|---------------|
| [`00_overview.md`](00_overview.md) | Visi, filosofi inti, diagram alur, dan batasan proyek (dokumen ini) |
| [`01_requirements.md`](01_requirements.md) | Kebutuhan fungsional, non-fungsional, dan user stories |
| [`02_architecture.md`](02_architecture.md) | Arsitektur teknis, batasan stack, struktur folder, dan modul |
| [`04_data_models.md`](04_data_models.md) | Skema database, relasi entitas, dan struktur payload |
| [`06_ui_design_system.md`](06_ui_design_system.md) | Design tokens, palet warna, tipografi, dan aturan UI Hallmark |
| [`08_milestones.md`](08_milestones.md) | Roadmap fase eksekusi bertahap dan kriteria Definition of Done |
