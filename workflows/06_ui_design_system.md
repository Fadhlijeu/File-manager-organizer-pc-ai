# 06. UI Design System & Hallmark Principles — OmniFile AI 🎨

Dokumen ini mendefinisikan sistem desain antarmuka pengguna (*UI Design System*) untuk **OmniFile AI**, mengadopsi standar **Hallmark Design System** (Anti-AI-Slop, tenang, presisi, utilitarian, dan modern).

---

## 🎯 Filosofi Desain

- **Genre**: Modern-Minimalis × Utilitarian
- **Tone**: Profesional, tenang, tegas, dan fokus pada kejelasan data.
- **Prinsip Utama**: *"A software should feel like a precision instrument, not a flashy billboard."*
- **Larangan Keras Anti-AI-Slop**:
  - Dilarang menggunakan gradien neon ungu / pink jenuh.
  - Dilarang meletakkan ornamen hiasan palsu yang tidak interaktif.
  - Dilarang menggabungkan emoji campur-aduk pada navigasi utama.
  - Ikon wajib bersumber dari **Google Material Symbols Outlined**.

---

## 🎨 Design Tokens (CSS Custom Properties)

```css
:root {
  /* Surface & Background */
  --bg-app: #0f1117;
  --bg-surface: #181b24;
  --bg-surface-elevated: #222634;
  --border-subtle: #2d3345;
  --border-focus: #4f6bfe;

  /* Typography Colors */
  --text-primary: #f3f4f6;
  --text-secondary: #9ca3af;
  --text-muted: #6b7280;

  /* Semantic Status Colors */
  --color-brand: #3b82f6;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #06b6d4;

  /* Typography Scale */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Spacing & Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-max: 14px; /* Batas maksimal kelengkungan sudut */
}
```

---

## 🔘 Ikonografi: Material Symbols Outlined

Semua kontrol antarmuka, tombol aksi, dan status menggunakan ikon dari keluarga Google Material Symbols Outlined:

| Komponen | Nama Ikon | Kegunaan |
|----------|-----------|----------|
| Dashboard / Beranda | `dashboard` | Menu utama |
| Pengaturan | `settings` | Panel konfigurasi |
| Simpan | `save` | Tombol penyimpanan data |
| Hapus | `delete` | Aksi penghapusan |
| Cari | `search` | Input pencarian |
| Peringatan | `warning` | Status anomali / perhatian |
| Sukses | `check_circle` | Konfirmasi berhasil |
| Batal / Tutup | `close` | Menutup modal dialog |

---

## 📐 Komponen Inti & State Interaksi

1. **Button**:
   - `btn--primary`: Latar belakang warna brand dengan teks kontras.
   - `btn--secondary`: Border subtil dengan latar transparan/elevated.
   - `btn--danger`: Aksi destruktif dengan konfirmasi ganda.
   - Selalu memiliki state: `:hover`, `:active`, `:focus-visible`, dan `:disabled`.

2. **Card & Panel**:
   - Latar belakang `--bg-surface`, border 1px `--border-subtle`, border radius `--radius-md` (maks 14px).
   - Tanpa bayangan (*shadow*) raksasa yang berlebihan; gunakan elevasi warna yang terukur.

3. **Status Badges**:
   - Berisi ikon status + teks label deskriptif (tidak pernah hanya mengandalkan warna bulat saja demi aksesibilitas).
