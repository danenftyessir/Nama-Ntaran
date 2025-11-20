# 🚀 Quick Start Guide - Seeding Script 01: Users

## Langkah-langkah Cepat

### 1️⃣ Setup (5 menit)

```bash
# Masuk ke folder seeders
cd database/seeders

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 2️⃣ Konfigurasi Supabase

Edit file `.env`:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Cara dapat credentials:**
1. Login ke https://app.supabase.com/
2. Pilih project Anda
3. Settings → API
4. Copy **Project URL** dan **service_role key**

### 3️⃣ Pastikan CSV Ada

File harus ada di:
```
database/detail_sekolah_dikdas_20251113_022936.csv
```

### 4️⃣ Run Script!

```bash
npm run seed:users
```

### 5️⃣ Verifikasi

Login ke Supabase Dashboard dan check:
```sql
SELECT role, COUNT(*) FROM users GROUP BY role;
```

Expected:
```
school    | ~5000+
catering  | 100
admin     | 5
```

## ✅ Checklist

Sebelum run script:

- [ ] Node.js installed (v18+)
- [ ] Supabase project created
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured with correct credentials
- [ ] CSV file exists at correct location
- [ ] Supabase `users` table created (run migrations first)

## 🔐 Default Passwords

| Role | Password |
|------|----------|
| School | NPSN masing-masing (contoh: `60706559`) |
| Catering | `catering123` |
| Admin | `Admin@MBG2025` |

## ⏱️ Expected Duration

- Small dataset (<100 schools): ~5-10 seconds
- Medium dataset (1000 schools): ~20-40 seconds
- Large dataset (5000+ schools): ~40-80 seconds

## 🐛 Common Issues

**Error: Missing credentials**
→ Check `.env` file exists and has correct values

**Error: CSV not found**
→ Check CSV path is correct

**Error: Duplicate key**
→ Users already seeded, skip to next script

## 📞 Need Help?

Check `README.md` untuk detailed documentation.

---

**Next Step:** Setelah berhasil, lanjut ke `02-seed-schools.ts`
