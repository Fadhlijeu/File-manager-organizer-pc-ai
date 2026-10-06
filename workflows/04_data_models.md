# 04. Data Models & Database Schema — OmniFile AI 🗄️

Dokumen ini mendefinisikan skema data, struktur entitas, relasi, dan model penyimpanan data untuk **OmniFile AI**.

---

## 📊 Database Engine & Mode

- **Engine**: SQLite (WAL Mode / Foreign Keys ON) atau Local Storage
- **Integritas**: Seluruh mutasi data dilakukan dalam transaksi atomik
- **Audit Field**: Setiap tabel utama memiliki `created_at` dan `updated_at`

---

## 🗂️ Skema Entitas Utama

```sql
-- Skema Tabel Utama
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    metadata_json TEXT DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Indeks Kinerja Pencarian
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
```

---

## 📦 Data Transfer Object (DTO) / Type Definitions

```typescript
export interface ItemEntity {
    id: string;
    name: string;
    category: string;
    status: 'ACTIVE' | 'ARCHIVED' | 'PENDING';
    metadataJson?: string;
    createdAt: number;
    updatedAt: number;
}
```
