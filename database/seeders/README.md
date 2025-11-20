# MBG Database Seeders

Scripts untuk seeding database Makanan Bergizi Gratis ke Supabase.

## 📋 Prerequisites

1. **Node.js** (v18 atau lebih baru)
2. **Supabase Project** yang sudah setup
3. **CSV File** data sekolah: `detail_sekolah_dikdas_20251113_022936.csv`

## 🚀 Setup

### 1. Install Dependencies

```bash
cd database/seeders
npm install
```

### 2. Configure Environment Variables

Copy file `.env.example` ke `.env`:

```bash
cp .env.example .env
```

Edit `.env` dan isi dengan credentials Supabase Anda:

```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Cara mendapatkan credentials:**

1. Buka [Supabase Dashboard](https://app.supabase.com/)
2. Pilih project Anda
3. Pergi ke **Project Settings** → **API**
4. Copy **Project URL** untuk `SUPABASE_URL`
5. Copy **service_role key** untuk `SUPABASE_SERVICE_ROLE_KEY`

   ⚠️ **PENTING:** Jangan share service_role key ke public!

### 3. Pastikan CSV File Ada

Script akan mencari file CSV di:
```
database/detail_sekolah_dikdas_20251113_022936.csv
```

Pastikan file ini ada di lokasi tersebut.

## 📊 Seeding Scripts

### Script 01: Users & Authentication

**File:** `01-seed-users.ts`

**Purpose:** Seed users table dengan 3 tipe user:
- 🏫 **School users** (dari CSV)
- 🍽️ **Catering users** (generated)
- 👨‍💼 **Admin users** (predefined)

**Run:**
```bash
npm run seed:users
```

atau

```bash
npx ts-node 01-seed-users.ts
```

**Output:**
```
[0.50s] ================================================================================
[0.50s] SEEDING SCRIPT 01: USERS & AUTHENTICATION
[0.50s] ================================================================================
[0.51s] Initializing Supabase client...
[0.52s] ✅ Supabase client initialized

[0.52s] ================================================================================
[0.52s] STEP 1: GENERATING SCHOOL USERS FROM CSV
[0.52s] ================================================================================
[1.23s] ✅ Read 5234 schools from CSV
[5.67s] Generating school users from CSV...
[25.43s] ✅ Generated 5234 school users
[25.44s] Inserting 5234 school users in 53 batches...
[███████████████████████████████] 100.0% - Inserting school users (5234/5234)

[45.21s] ================================================================================
[45.21s] STEP 2: GENERATING CATERING USERS
[45.21s] ================================================================================
[45.67s] Generating 100 catering users...
[48.32s] ✅ Generated 100 catering users
[48.33s] Inserting 100 catering users in 1 batches...
[███████████████████████████████] 100.0% - Inserting catering users (100/100)

[51.12s] ================================================================================
[51.12s] STEP 3: GENERATING ADMIN USERS
[51.12s] ================================================================================
[51.15s] Generating admin users...
[51.89s] ✅ Generated 5 admin users
[51.90s] Inserting 5 admin users in 1 batches...
[███████████████████████████████] 100.0% - Inserting admin users (5/5)

[52.45s] ================================================================================
[52.45s] SEEDING SUMMARY
[52.45s] ================================================================================

📊 SCHOOL USERS:
   Total: 5234
   ✅ Success: 5234
   ❌ Failed: 0
   Success Rate: 100.0%

📊 CATERING USERS:
   Total: 100
   ✅ Success: 100
   ❌ Failed: 0
   Success Rate: 100.0%

📊 ADMIN USERS:
   Total: 5
   ✅ Success: 5
   ❌ Failed: 0
   Success Rate: 100.0%

📊 OVERALL:
   Total Users: 5339
   ✅ Successfully Inserted: 5339
   ❌ Failed: 0
   Success Rate: 100.0%

[52.50s] ================================================================================
[52.50s] ✅ SEEDING COMPLETED!
[52.50s] ================================================================================

Stats saved to: database/seeding-logs/01-users-stats.json
```

**Data yang di-seed:**

| Role | Count | Email Format | Password |
|------|-------|--------------|----------|
| School | ~5,000+ | `school_{NPSN}@mbg.id` | NPSN (hashed) |
| Catering | 100 | `{slug}@catering.mbg.id` | `catering123` (hashed) |
| Admin | 5 | `admin@mbg.id`, etc. | `Admin@MBG2025` (hashed) |

**Default Passwords:**
- School: Menggunakan NPSN sebagai password (contoh: `60706559`)
- Catering: `catering123` (semua catering)
- Admin: `Admin@MBG2025` (semua admin)

⚠️ **CATATAN KEAMANAN:**
- Passwords ini hanya untuk testing/development
- Untuk production, wajib ganti dengan sistem password reset
- Atau generate random password dan kirim via email

## 🔍 Verification

Setelah seeding, verifikasi di Supabase Dashboard:

1. Buka **Table Editor** → **users**
2. Check jumlah records:
   ```sql
   SELECT role, COUNT(*) as count
   FROM users
   GROUP BY role;
   ```

   Expected output:
   ```
   role      | count
   ----------|-------
   school    | ~5000+
   catering  | 100
   admin     | 5
   ```

3. Test login dengan salah satu user:
   ```sql
   SELECT email, name, role, is_active, is_verified
   FROM users
   WHERE email = 'school_60706559@mbg.id';
   ```

## 📁 Generated Files

Script akan generate files berikut:

```
database/seeding-logs/
└── 01-users-stats.json    # Detailed statistics dari seeding
```

**Contoh `01-users-stats.json`:**
```json
{
  "totalSchools": 5234,
  "totalCaterings": 100,
  "totalAdmins": 5,
  "successSchools": 5234,
  "successCaterings": 100,
  "successAdmins": 5,
  "failedSchools": 0,
  "failedCaterings": 0,
  "failedAdmins": 0,
  "errors": []
}
```

## ⚙️ Configuration

Edit konfigurasi di dalam file `01-seed-users.ts`:

```typescript
const CONFIG = {
  BATCH_SIZE: 100,           // Insert 100 users per batch
  CATERING_COUNT: 100,       // Number of catering vendors
  ADMIN_COUNT: 5,            // Number of admin users
  BCRYPT_ROUNDS: 10,         // Password hash rounds
  // ... other configs
}
```

## 🐛 Troubleshooting

### Error: "Missing Supabase credentials"

**Solusi:** Pastikan file `.env` sudah dibuat dan berisi credentials yang benar.

### Error: "CSV file not found"

**Solusi:** Pastikan file CSV ada di lokasi yang benar:
```
database/detail_sekolah_dikdas_20251113_022936.csv
```

### Error: "duplicate key value violates unique constraint"

**Solusi:** Users sudah di-seed sebelumnya. Options:
1. **Clear users table** (hati-hati, ini akan hapus semua users!):
   ```sql
   DELETE FROM users;
   ```
2. Atau skip seeding users dan lanjut ke script berikutnya

### Error: "permission denied for table users"

**Solusi:** Pastikan menggunakan `service_role` key, bukan `anon` key.

### Performance Issues / Timeout

**Solusi:**
- Kurangi `BATCH_SIZE` di config (misalnya dari 100 ke 50)
- Kurangi jumlah catering (`CATERING_COUNT`)
- Run script di server yang lebih dekat dengan Supabase region

## 📊 Performance Metrics

Expected performance:
- **School users (5000+):** ~30-60 seconds
- **Catering users (100):** ~5-10 seconds
- **Admin users (5):** ~2-3 seconds
- **Total:** ~40-80 seconds

Actual performance tergantung:
- Network latency ke Supabase
- Server resources
- Batch size
- Supabase plan (Free vs Pro)

## 🔐 Security Notes

1. **Service Role Key:**
   - Hanya gunakan di backend/seeding scripts
   - JANGAN expose ke frontend
   - JANGAN commit ke Git

2. **Default Passwords:**
   - Hanya untuk testing
   - Production: implement password reset
   - Atau kirim email dengan random password

3. **User Verification:**
   - All schools: `is_verified = true`
   - Caterings: 80% verified, 20% pending
   - Admins: `is_verified = true`

## 📝 Next Steps

Setelah users berhasil di-seed, lanjut ke:

1. **Script 02:** `seed-schools.ts` - Seed schools table
2. **Script 03:** `seed-caterings.ts` - Seed caterings table
3. **Script 04:** `seed-menu-items.ts` - Seed menu items
4. Dan seterusnya...

## 🆘 Support

Jika ada masalah:
1. Check logs di `database/seeding-logs/`
2. Check error messages di console
3. Verify Supabase connection
4. Check table structure di Supabase

---

**Author:** MBG Development Team
**Version:** 1.0.0
**Last Updated:** 2025-11-19
