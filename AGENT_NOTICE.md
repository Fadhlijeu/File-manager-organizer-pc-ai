# AGENT_NOTICE.md
## OmniFile AI — Panduan Wajib untuk Setiap Agent

> ⚠️ **BACA INI SEBELUM MENYENTUH SATU PUN FILE DI PROJECT INI.**
> File ini adalah kompas utama. Jika kamu bingung atau baru memulai sesi, baca ulang dari atas.

---

## 🔴 MANDATORY FIRST STEPS (Jangan Pernah Dilewati)

Setiap kali kamu memulai sesi baru di project ini, WAJIB lakukan urutan berikut:

```text
1. Baca AGENT_NOTICE.md ini sampai selesai (file ini)
2. Baca progress.md → pahami status saat ini + riwayat session sebelumnya
3. Baca file workflow yang relevan dengan task kamu di folder workflows/
4. BARU mulai bekerja / menulis kode
```

**Dilarang langsung coding atau memodifikasi file tanpa membaca `progress.md` terlebih dahulu.**

---

## 📌 Project Identity

| Field | Value |
|-------|-------|
| **Nama Proyek** | OmniFile AI |
| **Tipe** | desktop |
| **Tech Stack** | FastAPI + Edge App Mode + Vanilla JS + PowerShell + LLM Providers |
| **Repositori** | GitHub (private) |
| **Lokasi Direktori** | `D:/PROJECT/File-manager-organizer-pc-ai` |
| **Tujuan Utama** | Autonomous Local File Manager & AI Organizer with Direct Host Access, Safe ReAct Engine, and Anti-Slop UI |

---

## 🗂️ Navigasi Cepat Workflow

Sebelum mengerjakan komponen spesifik, konsultasikan dokumen panduan terkait:

| Komponen / Task yang Dikerjakan | Baca Dokumen Ini Terlebih Dahulu |
|---------------------------------|----------------------------------|
| Visi besar, filosofi, prinsip dasar | [`workflows/00_overview.md`](workflows/00_overview.md) |
| Kebutuhan fungsional & kriteria selesai | [`workflows/01_requirements.md`](workflows/01_requirements.md) |
| Arsitektur sistem, modul, data flow, API | [`workflows/02_architecture.md`](workflows/02_architecture.md) |
| Model data, skema database, DTO | [`workflows/04_data_models.md`](workflows/04_data_models.md) |
| Desain antarmuka, CSS token, font, icon | [`workflows/06_ui_design_system.md`](workflows/06_ui_design_system.md) |
| Roadmap fase pengembangan & Definition of Done | [`workflows/08_milestones.md`](workflows/08_milestones.md) |
| Riwayat perubahan & memori sesi kerja | [`progress.md`](progress.md) |

---

## ✅ ATURAN WAJIB & STRICT CONSTRAINTS

### 1. Batasan Tech Stack
- Gunakan hanya stack teknologi yang telah disepakati di `workflows/02_architecture.md`.
- **Dilarang menambahkan framework atau dependency baru** tanpa evaluasi kebutuhan konkret dan persetujuan eksplisit.
- Jika menambahkan library eksternal, dokumentasikan alasannya di `progress.md`.

### 2. Standar Desain Anti-AI-Slop (Hallmark Principles)
- **Icons**: Wajib konsisten (misal: Material Symbols Outlined). Jangan gunakan emoji untuk kontrol antarmuka utama.
- **Warna & Tema**: Gunakan CSS custom properties / design tokens. Dilarang hardcode warna heksadesimal sembarangan.
- **Tipografi**: Gunakan font standar proyek (misal: Inter / JetBrains Mono).
- **Hindari AI Slop**: Jangan menambahkan elemen hiasan murahan, gradien ungu neon berlebihan, atau chatbot popup mengambang yang tidak diminta.

### 3. Eksekusi Non-Interaktif & Deterministic
- Semua perintah terminal **wajib bersifat non-interaktif** (misal: `npx -y`, `npm install`, python non-blocking).
- Jangan jalankan perintah yang menggantung menunggu input keyboard dari pengguna.

### 4. Error Handling & Robustness
- Setiap handler operasi / API / database wajib memiliki penanganan error terstruktur (`try-catch` / error types).
- Berikan pesan error yang informatif dan jelas kepada pengguna, bukan pesan generik seperti "Something went wrong".

---

## ⛔ LARANGAN KERAS (Don'ts)

```text
❌ DILARANG menghapus atau merombak arsitektur tanpa konfirmasi
❌ DILARANG mengabaikan progress.md di awal maupun akhir sesi
❌ DILARANG menulis kode placeholder dummy (// TODO implement later) pada fitur yang diminta
❌ DILARANG mengubah skema data tanpa rencana migrasi yang jelas
❌ DILARANG hardcode credential, token API, atau konfigurasi rahasia
```

---

## 🔄 Prosedur Wajib: Update `progress.md`

Setelah menyelesaikan task apa pun, kamu **WAJIB** menambahkan catatan sesi baru pada bagian akhir file `progress.md` dengan format:

```markdown
### SESSION {N} — {YYYY-MM-DD}

**Agent**: [Nama Agent]
**Task**: [Deskripsi ringkas task]

#### Actions Taken
- ✅ [Langkah 1 yang diselesaikan]
- ✅ [Langkah 2 yang diselesaikan]

#### Files Modified / Created
- `path/to/file` — [Deskripsi perubahan]

#### Decisions & Rationale
| Keputusan | Alasan |
|-----------|--------|
| [Pilihan arsitektur/library] | [Alasan teknis] |

#### Open Questions / Next Steps
- [ ] [Rencana langkah berikutnya]
```

---

## 📞 Prinsip Komunikasi: Tanya Jika Tidak Yakin

1. Periksa berkas workflow terkait terlebih dahulu.
2. Periksa riwayat keputusan di `progress.md`.
3. Jika terdapat ambiguitas arsitektural yang kritis: **tanyakan langsung kepada pengguna, jangan berasumsi sendiri**.

> *"Lebih baik bertanya sekali daripada harus merombak sistem dua kali."*
