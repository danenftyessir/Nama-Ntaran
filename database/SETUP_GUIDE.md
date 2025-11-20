# Database Setup Guide - MBG System

Panduan lengkap untuk setup database Supabase dan menjalankan seeding.

## 📋 Prerequisites

1. **Supabase Project** yang sudah dibuat
2. **Supabase credentials** (URL + Service Role Key)
3. **Node.js** v18+ installed
4. **CSV files** sekolah sudah tersedia

---

## 🔧 Step-by-Step Setup

### Step 1: Buat Tables di Supabase

Anda perlu menjalankan SQL migrations di Supabase SQL Editor untuk membuat semua tables.

#### Cara 1: Via Supabase Dashboard (Recommended)

1. Buka [Supabase Dashboard](https://app.supabase.com/)
2. Pilih project Anda
3. Pergi ke **SQL Editor**
4. Klik **New Query**
5. Jalankan migrations dalam urutan berikut:

**A. Migrations Dasar (sudah ada):**
```sql
-- 1. Jalankan schema.sql (users, schools, caterings, deliveries, verifications, etc)
-- File: database/schema.sql
```

**B. Migration Baru (untuk menu & allocations):**
```sql
-- 2. Jalankan migration 005
-- File: database/migrations/005_add_menu_and_allocation_tables.sql
```

#### Cara 2: Via psql Command Line

```bash
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" < database/schema.sql
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" < database/migrations/005_add_menu_and_allocation_tables.sql
```

---

### Step 2: Verifikasi Tables Sudah Dibuat

Di Supabase SQL Editor, jalankan:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected tables:**
- ✅ users
- ✅ schools
- ✅ caterings
- ✅ menu_items (NEW)
- ✅ deliveries
- ✅ allocations (NEW)
- ✅ verifications
- ✅ escrow_transactions
- ✅ issues
- (dan tables lainnya...)

---

### Step 3: Setup Environment Variables untuk Seeding

```bash
cd database/seeders
cp .env.example .env
```

Edit `.env`:
```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Step 4: Install Dependencies

```bash
cd database/seeders
npm install
```

---

### Step 5: Jalankan Seeding Scripts (URUTAN PENTING!)

**⚠️ PENTING: Jalankan sesuai urutan dependency!**

#### **Phase 1: Foundation Data**

```bash
# 1. Seed users, schools, caterings (semua dalam 1 script)
npm run seed:users
```

**Output expected:**
- ✅ ~5,000-30,000 school users
- ✅ 100 catering users
- ✅ Admin users per kabupaten

#### **Phase 2: Menu Catalog**

```bash
# 2. Seed menu items
npm run seed:menu-items
```

**Output expected:**
- ✅ ~1,500-2,500 menu items
- ✅ 15-25 menus per catering
- ✅ Full nutritional data

#### **Phase 3: Transactions (BELUM DIBUAT)**

```bash
# 3. Seed deliveries (NEED TO CREATE SCRIPT 04 FIRST!)
# npm run seed:deliveries

# 4. Seed verifications (NEED TO CREATE SCRIPT 05 FIRST!)
# npm run seed:verifications

# 5. Seed allocations (DEPENDS ON DELIVERIES!)
npm run seed:allocations
```

---

## 📊 Seeding Status Tracker

| No | Script | Tables | Status | Dependencies |
|----|--------|--------|--------|--------------|
| 01 | `01-seed-users.ts` | users, schools, caterings | ✅ READY | None |
| 02 | `02-seed-menu-items.ts` | menu_items | ✅ READY | caterings |
| 03 | `03-seed-allocations.ts` | allocations | ✅ READY | deliveries, verifications |
| 04 | `04-seed-deliveries.ts` | deliveries | ❌ TODO | schools, caterings, menu_items |
| 05 | `05-seed-verifications.ts` | verifications | ❌ TODO | deliveries |

---

## 🔄 Correct Execution Order

Karena ada dependencies, urutan yang BENAR adalah:

```
1. users, schools, caterings  (Script 01)
2. menu_items                 (Script 02)
3. deliveries                 (Script 04) ← NEED TO CREATE!
4. verifications              (Script 05) ← NEED TO CREATE!
5. allocations                (Script 03)
6. payments                   (Script 06) ← NEED TO CREATE!
7. escrow_transactions        (Script 07) ← NEED TO CREATE!
8. issues                     (Script 08) ← NEED TO CREATE!
```

---

## ⚠️ Common Errors & Solutions

### Error: "Could not find the table 'public.menu_items' in the schema cache"

**Penyebab:** Table belum dibuat di Supabase

**Solusi:**
1. Jalankan migration 005 di Supabase SQL Editor
2. Refresh schema cache
3. Verifikasi table ada dengan query di Step 2

### Error: "Missing Supabase credentials"

**Penyebab:** File `.env` belum dibuat atau credentials salah

**Solusi:**
1. Copy `.env.example` ke `.env`
2. Isi dengan credentials dari Supabase Dashboard → Settings → API

### Error: "No deliveries found. Please run 04-seed-deliveries.ts first"

**Penyebab:** Mencoba run script 03 (allocations) sebelum deliveries di-seed

**Solusi:**
1. Buat script 04-seed-deliveries.ts dulu
2. Run deliveries seeding
3. Baru run allocations seeding

---

## 🧪 Test Mode

Untuk testing dengan data lebih sedikit, edit CONFIG di masing-masing script:

```typescript
const CONFIG = {
  TEST_MODE: true,  // Set true untuk testing
  TEST_SCHOOLS: 3,
  TEST_CATERINGS: 2,
  // ...
}
```

---

## 📝 Logs & Statistics

Setiap seeding akan generate stats file di:
```
database/seeding-logs/
├── 01-users-stats.json
├── 02-menu-items-stats.json
├── 03-allocations-stats.json
└── ...
```

---

## 🔍 Verifikasi Data

Setelah seeding, verifikasi di Supabase SQL Editor:

```sql
-- Count records per table
SELECT
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM schools) as schools,
  (SELECT COUNT(*) FROM caterings) as caterings,
  (SELECT COUNT(*) FROM menu_items) as menu_items,
  (SELECT COUNT(*) FROM deliveries) as deliveries,
  (SELECT COUNT(*) FROM allocations) as allocations;

-- Check menu distribution
SELECT category, COUNT(*) as count
FROM menu_items
GROUP BY category
ORDER BY count DESC;

-- Check allocation status distribution
SELECT status, COUNT(*) as count
FROM allocations
GROUP BY status
ORDER BY count DESC;
```

---

## 📞 Support

Jika ada masalah:
1. Check logs di `database/seeding-logs/`
2. Check error messages di console
3. Verify table structure di Supabase
4. Check dependencies sudah ter-seed

---

**Last Updated:** 2025-11-20
**Version:** 1.0
