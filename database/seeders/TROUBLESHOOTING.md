# Troubleshooting Guide - Seeding Scripts

## 🔴 Error 1: "users_role_check" Constraint Violation

### Problem:
```
new row for relation "users" violates check constraint "users_role_check"
```

### Root Cause:
Role `government` tidak ada dalam constraint check di database. Database schema hanya mengizinkan: `'admin', 'school', 'catering'`.

### Solution:
Upload migration file ke Supabase SQL Editor:

**File**: `database/migrations/028_fix_user_roles.sql`

```sql
-- Drop existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new constraint with 'government' role
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'government', 'school', 'catering'));
```

### Steps:
1. Buka Supabase Dashboard
2. Go to SQL Editor
3. Copy-paste isi file `028_fix_user_roles.sql`
4. Run query
5. Jalankan ulang seeding: `npx ts-node database/seeders/41-seed-government-admins.ts`

---

## 🔴 Error 2: Duplicate Key "allocation_id"

### Problem:
```
duplicate key value violates unique constraint "allocations_allocation_id_key"
```

### Root Cause:
Allocations sudah pernah di-seed sebelumnya. Constraint UNIQUE pada `allocation_id` mencegah duplicate.

### Solution A: Clear Existing Data (Recommended for Development)

**File**: `database/seeders/clear-seeded-data.sql`

Upload script ini ke Supabase SQL Editor. Jika masih gagal, gunakan Solution B (Aggressive Cleanup).

### Solution B: Aggressive Cleanup (If Solution A Fails)

**File**: `database/seeders/aggressive-cleanup.sql`

Jika clear-seeded-data.sql masih menyisakan data (mungkin karena foreign key constraints), gunakan script yang lebih agresif:

**Upload file `aggressive-cleanup.sql` ke Supabase SQL Editor**

Script ini menggunakan:
- `TRUNCATE CASCADE` - Memaksa hapus semua data termasuk dependencies
- `SET session_replication_role = 'replica'` - Menonaktifkan triggers sementara
- Reset semua sequences ke 1
- Verifikasi lengkap setelah cleanup

**Langkah-langkah**:
1. Buka Supabase Dashboard → SQL Editor
2. Copy-paste isi file `aggressive-cleanup.sql`
3. Run query (perhatikan warnings!)
4. Pastikan semua count = 0 di hasil verifikasi
5. Jalankan ulang seeding scripts 41, 42, 43

### Solution C: Skip Existing Allocations

Modify seeding script to check for existing allocations first (not implemented yet).

---

## 🔴 Error 3: TypeError - Cannot read properties of undefined

### Problem:
```
TypeError: Cannot read properties of undefined (reading 'blockchain_block_number')
TypeError: Cannot read properties of undefined (reading 'confirmed_by_school_at')
```

### Root Cause:
Ada gap dalam array `payments[i]` karena beberapa batch insert gagal. Ketika ada error di batch sebelumnya, array index tidak match dengan allocation index.

### Solution: ✅ FIXED

**Script telah diperbaiki** di `42-seed-government-allocations.ts`:

Menggunakan `Map<number, PaymentInsert>` untuk track payment data berdasarkan `allocation_id` alih-alih array index:

```typescript
// Line 675 - Deklarasi map
const paymentDataMap = new Map<number, PaymentInsert>()

// Line 685 - Simpan payment data
paymentDataMap.set(allocationDbId, payment)

// Line 747 - Ambil dari map
const paymentData = allocationDbId ? paymentDataMap.get(allocationDbId) : undefined

// Line 750 - Gunakan paymentData
if (allocationDbId && paymentDbId && paymentData) {
  const events = generatePaymentEvents(paymentData, paymentDbId, allocation, allocationDbId)
}
```

**Langkah setelah fix**:
1. Run `aggressive-cleanup.sql` untuk hapus data lama
2. Jalankan ulang script 42: `npx ts-node database/seeders/42-seed-government-allocations.ts`
3. Error TypeError seharusnya sudah tidak muncul lagi

---

## 🔴 Error 4: Missing Supabase Credentials

### Problem:
```
Missing Supabase credentials in environment variables
```

### Root Cause:
File `.env` tidak ada atau tidak berisi Supabase credentials.

### Solution:

1. **Copy template .env**:
   ```bash
   cp .env.example .env
   ```

2. **Edit file `.env`** dan isi dengan credentials Anda:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Cara mendapatkan credentials**:
   - Login ke [Supabase Dashboard](https://app.supabase.com)
   - Pilih project Anda
   - Go to **Settings** → **API**
   - Copy:
     - **Project URL** → `SUPABASE_URL`
     - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

---

## 🟡 Warning: High Critical Risk in Vendor Assessment

### Issue:
```
By Risk Level:
  critical: 82 (82.0%)
```

### Root Cause:
Risk score calculation menghasilkan nilai tinggi karena random generation. Ini normal untuk development data.

### Notes:
- Ini adalah simulated data untuk development
- Risk score dihitung dari: `late_delivery_rate * 30 + quality_issue_rate * 40 + (1 - compliance_rate) * 30`
- Untuk production, data ini akan diisi dari actual performance metrics

### Solution (Optional):
Jika ingin risk distribution yang lebih realistis, edit file `43-seed-catering-complete-data.ts`:

```typescript
// Baris ~665, ubah range untuk generate risk yang lebih rendah:
const lateDeliveryRate = Math.random() * 0.05 // 0-5% (was 0-15%)
const qualityIssueRate = Math.random() * 0.03 // 0-3% (was 0-10%)
const complianceRate = 0.90 + Math.random() * 0.10 // 90-100% (was 80-100%)
```

---

## 🟢 Success: Catering Data Seeding Completed

### What was created:
- ✅ 200 Payment Methods (100 caterings × 2 methods each)
- ✅ 2,310 Menu Items (average 23 items per catering)
- ✅ 100 Vendor Risk Assessments

### Distribution:
**Payment Methods**:
- Bank Transfer: 100 (100%)
- Cryptocurrency: 47 (47%)
- E-wallet: 53 (53%)

**Menu Items by Category**:
- Side Dishes: 21.9%
- Complete Meals: 18.1%
- Beverages: 11.6%
- Soups: 11.5%
- Desserts: 11.2%
- Salads: 11.1%
- Snacks: 10.8%
- Main Courses: 4.0%

---

## 📋 Recommended Execution Order

### First Time Setup:

1. **Upload Migrations**:
   ```sql
   -- In Supabase SQL Editor, run in order:
   026_add_admin_enhancements.sql
   027_add_catering_enhancements.sql
   028_fix_user_roles.sql
   ```

2. **Clear existing data (if needed)**:
   ```sql
   -- Only if you're re-running seeding
   DELETE FROM public_payment_feed;
   DELETE FROM payment_events;
   DELETE FROM payments;
   UPDATE deliveries SET allocation_id = NULL;
   DELETE FROM allocations;
   DELETE FROM users WHERE role IN ('admin', 'government');
   ```

3. **Run Seeding Scripts**:
   ```bash
   # Seed admin users
   npx ts-node database/seeders/41-seed-government-admins.ts

   # Seed allocations & payments (requires deliveries to exist)
   npx ts-node database/seeders/42-seed-government-allocations.ts

   # Seed catering data
   npx ts-node database/seeders/43-seed-catering-complete-data.ts
   ```

---

## 🐛 Common Issues & Quick Fixes

### Issue: "Cannot find module '@supabase/supabase-js'"
**Fix**: `npm install @supabase/supabase-js bcrypt dotenv csv-parser`

### Issue: "deliveries table is empty"
**Fix**: Run base seeding first:
```bash
npx ts-node database/seeders/01-seed-users.ts
npx ts-node database/seeders/04-seed-deliveries.ts
```

### Issue: "Connection timeout"
**Fix**: Increase timeout or reduce batch size in config:
```typescript
const CONFIG = {
  BATCH_SIZE: 50, // Reduce from 100 to 50
  // ...
}
```

### Issue: Script running too slow
**Fix**: Enable TEST_MODE for smaller dataset:
```typescript
const CONFIG = {
  TEST_MODE: true, // Change to true
  // ...
}
```

---

## 📞 Getting Help

1. Check stats files in `database/seeding-logs/` for detailed error info
2. Check Supabase logs in Dashboard → Logs
3. Verify table schemas match migration files
4. Check PostgreSQL constraints with:
   ```sql
   SELECT conname, pg_get_constraintdef(oid)
   FROM pg_constraint
   WHERE conrelid = 'users'::regclass;
   ```

---

## 🎯 Quick Reference

### Clear All Seeded Data:
```sql
-- WARNING: Development only!
DELETE FROM public_payment_feed;
DELETE FROM payment_events;
DELETE FROM payments;
UPDATE deliveries SET allocation_id = NULL;
DELETE FROM allocations;
DELETE FROM catering_notifications;
DELETE FROM catering_feedback;
DELETE FROM catering_inventory;
DELETE FROM catering_performance_metrics;
DELETE FROM catering_delivery_schedules;
DELETE FROM catering_profiles;
DELETE FROM vendor_risk_assessments;
DELETE FROM payment_methods;
DELETE FROM menu_items WHERE catering_id IN (SELECT id FROM caterings);
DELETE FROM users WHERE role IN ('admin', 'government');
```

### Verify Seeded Data:
```sql
-- Count records
SELECT
  (SELECT COUNT(*) FROM users WHERE role = 'admin') as admins,
  (SELECT COUNT(*) FROM users WHERE role = 'government') as government_users,
  (SELECT COUNT(*) FROM allocations) as allocations,
  (SELECT COUNT(*) FROM payments) as payments,
  (SELECT COUNT(*) FROM payment_methods) as payment_methods,
  (SELECT COUNT(*) FROM menu_items) as menu_items,
  (SELECT COUNT(*) FROM vendor_risk_assessments) as risk_assessments;
```

---

**Last Updated**: 2025-11-27
