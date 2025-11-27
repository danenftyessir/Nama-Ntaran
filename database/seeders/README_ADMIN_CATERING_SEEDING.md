# Admin & Catering Seeding Documentation

## Overview

File-file seeding ini dirancang khusus untuk membuat data lengkap terkait **Admin/Pemerintah** dan **Catering Vendors** dalam sistem MBG (Makan Bergizi Gratis).

## 📁 File Seeding

### 1. `41-seed-government-admins.ts`

**Deskripsi**: Membuat data user admin untuk pemerintah (Dinas Pendidikan)

**Data yang dibuat**:
- **System Admins** (5 users):
  - `superadmin@mbg.id`
  - `admin@mbg.id`
  - `admin.monitoring@mbg.id`
  - `admin.finance@mbg.id`
  - `admin.support@mbg.id`

- **Provincial Admins** (38 provinsi × 3 admin = 114 users):
  - Kepala Dinas Pendidikan Provinsi: `kepala.disdik.{province}@mbg.id`
  - Kabid Program: `kabid.program.{province}@mbg.id`
  - Staff Monitoring: `staff.monitoring.{province}@mbg.id`

- **Kabupaten/Kota Admins** (~200+ users):
  - Kepala Dinas Kabupaten: `kepala.disdik.{kabupaten}@mbg.id`
  - Staff Kabupaten: `staff.{kabupaten}@mbg.id`

**Default Password**: `Admin@MBG2025`

**Peran/Role**:
- System admins: `role = 'admin'`
- Government officials: `role = 'government'`

**Dependencies**:
- Table `users` harus sudah ada

**Cara menjalankan**:
```bash
npx ts-node database/seeders/41-seed-government-admins.ts
```

**Output**:
- Total admins: ~320+ users
- Stats file: `database/seeding-logs/41-government-admins-stats.json`

---

### 2. `42-seed-government-allocations.ts`

**Deskripsi**: Membuat data budget allocations yang di-lock ke blockchain escrow

**Data yang dibuat**:
1. **Allocations**: Budget yang di-lock untuk setiap delivery
   - Status distribution:
     - `RELEASED` (60%): Dana sudah di-release ke catering
     - `LOCKED` (25%): Dana masih di-lock, menunggu verifikasi
     - `RELEASING` (5%): Sedang proses release
     - `ON_HOLD` (5%): Ada masalah
     - `CANCELLED` (3%): Dibatalkan
     - `LOCKING` (2%): Sedang proses lock

2. **Payments**: Record pembayaran untuk setiap allocation
   - Status mapping dari allocation status
   - Include blockchain transaction hash
   - Include block numbers

3. **Payment Events**: Audit trail untuk setiap event
   - `ALLOCATION_CREATED`
   - `FUND_LOCKED`
   - `DELIVERY_CONFIRMED`
   - `PAYMENT_RELEASING`
   - `PAYMENT_RELEASED`

4. **Public Payment Feed**: Data transparansi publik
   - Hanya untuk payments yang sudah `RELEASED`
   - Include nama sekolah, catering, region, amount
   - Include blockchain verification data

**Dependencies**:
- Table `deliveries` harus sudah terisi (dari seeding sebelumnya)
- Table `schools` dan `caterings` harus sudah terisi

**Cara menjalankan**:
```bash
npx ts-node database/seeders/42-seed-government-allocations.ts
```

**Output**:
- Allocations: Same as deliveries count
- Payments: Same as allocations count
- Payment Events: 2-4 events per payment
- Public Feed: ~60% of allocations (only RELEASED status)
- Stats file: `database/seeding-logs/42-government-allocations-stats.json`

---

### 3. `43-seed-catering-complete-data.ts`

**Deskripsi**: Membuat data lengkap untuk catering vendors

**Data yang dibuat**:

1. **Payment Methods** (2 methods per catering):
   - **Bank Transfer** (always):
     - Bank: BCA, BRI, BNI, Mandiri, BTN, CIMB, Permata, Danamon, BNI Syariah, BSI
     - Account number: Random 10-16 digits
     - Account holder: Company name

   - **E-wallet atau Cryptocurrency**:
     - E-wallet providers: OVO, DANA, GoPay, LinkAja, ShopeePay
     - Crypto: Ethereum wallet address

2. **Menu Items** (15-30 items per catering):
   - Categories:
     - `complete_meal` (40%): Nasi kotak komplit, dll
     - `main_course` (15%): Nasi goreng, dll
     - `soup` (15%): Soto, sup, dll
     - `side_dish` (15%): Ayam goreng, tempe, dll
     - `salad` (5%): Gado-gado, pecel, dll
     - `dessert` (5%): Buah, es buah, dll
     - `beverage` (3%): Jus, teh, dll
     - `snack` (2%): Lemper, risoles, dll

   - Include: Nutrition info (calories, protein, carbs, fat, fiber)
   - Include: Vitamins, minerals, allergens
   - 90% available, 10% not available
   - All halal certified

3. **Vendor Risk Assessments**:
   - Risk metrics:
     - Late delivery rate (0-15%)
     - Quality issue rate (0-10%)
     - Compliance rate (80-100%)
     - Average quality score (3.5-5.0)

   - Risk levels:
     - `low` (risk score < 25)
     - `medium` (risk score 25-50)
     - `high` (risk score 50-75)
     - `critical` (risk score > 75)

   - Recommended actions based on risk level
   - Historical deliveries data (50-500 deliveries)

**Dependencies**:
- Table `caterings` harus sudah terisi (dari 01-seed-users.ts)

**Cara menjalankan**:
```bash
npx ts-node database/seeders/43-seed-catering-complete-data.ts
```

**Output**:
- Payment Methods: ~200 (2 per catering)
- Menu Items: ~2000-3000 (15-30 per catering)
- Risk Assessments: ~100 (1 per catering)
- Stats file: `database/seeding-logs/43-catering-complete-data-stats.json`

---

## 🗄️ SQL Migrations

### 1. `026_add_admin_enhancements.sql`

**Deskripsi**: Menambahkan tabel dan fitur untuk admin/pemerintah

**Tables yang dibuat**:

1. **admin_profiles**: Profile lengkap admin
   - Personal info (nama, NIP, position)
   - Regional assignment (level, region_name, province, city)
   - Contact info (phone, office_address)
   - Permissions (JSONB)
   - Assigned schools (INTEGER[])

2. **admin_activity_log**: Audit trail aktivitas admin
   - Action type (LOCK_FUND, APPROVE_ALLOCATION, dll)
   - Target entity (allocation, payment, delivery, dll)
   - Metadata (JSONB)
   - Status (success/failed)

3. **budget_planning**: Perencanaan anggaran tahunan
   - Fiscal year, semester, quarter
   - Regional assignment (province, city, district)
   - Budget allocation (total, allocated, disbursed, remaining)
   - Target metrics (schools, students, feeding days, price per portion)
   - Approval workflow

4. **allocation_approvals**: Workflow approval allocations
   - Multi-level approval (Staff → Kabid → Kepala Dinas)
   - Decision (approved/rejected/escalated)
   - Notes

5. **performance_dashboards**: Pre-computed dashboard metrics
   - Dashboard type (national, provincial, city, district)
   - Time period (daily, weekly, monthly, quarterly, yearly)
   - Metrics (JSONB)
   - Growth percentages

6. **government_notifications**: Notifikasi untuk admin
   - Notification type
   - Severity (info, warning, error, critical)
   - Related entity
   - Actions required

**Views yang dibuat**:
- `admin_daily_summary`: Summary harian
- `admin_regional_summary`: Summary per region
- `admin_catering_performance`: Performance catering

**Alterations**:
- Add columns to `allocations`: created_by, approved_by, approved_at, admin_notes, cancelled_by, cancelled_at, cancellation_reason, budget_id
- Add column to `caterings`: latest_risk_assessment_id

**Triggers**:
- Auto-update `updated_at` timestamp
- RLS (Row Level Security) policies

---

### 2. `027_add_catering_enhancements.sql`

**Deskripsi**: Menambahkan tabel dan fitur untuk catering vendors

**Tables yang dibuat**:

1. **catering_profiles**: Profile lengkap catering
   - Business info (type, established_year, NPWP, SIUP)
   - Halal certificate (number, expiry)
   - Production capacity (max_daily_capacity, min_order_quantity)
   - Service area (provinces, cities, radius)
   - Certifications (JSONB)
   - Owner/contact info
   - Documents (JSONB)
   - Verification status

2. **catering_delivery_schedules**: Jadwal pengiriman reguler
   - Schedule type (one_time, recurring)
   - Day of week, delivery time
   - Portions
   - Active status

3. **catering_performance_metrics**: Real-time performance metrics
   - Delivery metrics (total, successful, late, cancelled)
   - Quality metrics (avg rating, issues count)
   - Compliance metrics
   - Financial metrics (revenue, pending, completed)
   - Customer satisfaction

4. **catering_inventory**: Inventory bahan baku (optional)
   - Item name, category
   - Quantity, unit
   - Minimum quantity (reorder threshold)
   - Supplier info
   - Cost, total value
   - Expiry date
   - Status (available, low_stock, out_of_stock, expired)

5. **catering_feedback**: Feedback dari sekolah
   - Feedback type (complaint, compliment, suggestion, question)
   - Subject, message
   - Rating (1-5)
   - Categories
   - Attachments (photos)
   - Response & resolution

6. **catering_notifications**: Notifikasi untuk catering
   - Notification type
   - Priority (low, normal, high, urgent)
   - Related entity
   - Actions required

**Views yang dibuat**:
- `catering_revenue_summary`: Summary revenue per catering
- `catering_upcoming_deliveries`: Upcoming deliveries
- `catering_payment_status`: Payment status summary

**Alterations**:
- Add columns to `caterings`: certification_status, last_audit_date, next_audit_date, is_suspended, suspended_at, suspension_reason, min_order_portions, max_daily_portions, delivery_vehicle_type, delivery_staff_count

**Triggers**:
- Auto-update `updated_at` timestamp
- Auto-update inventory status based on quantity and expiry
- Auto-update catering total_deliveries on new delivery
- RLS policies

---

## 🚀 Execution Order

**Recommended order untuk seeding complete data**:

1. **Base seeding** (existing):
   ```bash
   npx ts-node database/seeders/01-seed-users.ts
   npx ts-node database/seeders/02-seed-menu-items.ts
   npx ts-node database/seeders/04-seed-deliveries.ts
   ```

2. **Apply migrations**:
   ```sql
   -- Upload ke Supabase SQL Editor:
   database/migrations/026_add_admin_enhancements.sql
   database/migrations/027_add_catering_enhancements.sql
   ```

3. **Admin & Catering seeding** (new):
   ```bash
   npx ts-node database/seeders/41-seed-government-admins.ts
   npx ts-node database/seeders/42-seed-government-allocations.ts
   npx ts-node database/seeders/43-seed-catering-complete-data.ts
   ```

---

## 📊 Data Statistics

### Expected Data Volume:

| Table | Records | Description |
|-------|---------|-------------|
| `users` (admin) | ~320 | System + Provincial + Kabupaten admins |
| `allocations` | ~Same as deliveries | Budget allocations |
| `payments` | ~Same as allocations | Payment records |
| `payment_events` | ~3× allocations | Event audit trail |
| `public_payment_feed` | ~60% of allocations | Public transparency |
| `payment_methods` | ~200 | 2 per catering |
| `menu_items` | ~2000-3000 | 15-30 per catering |
| `vendor_risk_assessments` | ~100 | 1 per catering |

---

## 🔑 Sample Credentials

### System Admin:
```
Email: superadmin@mbg.id
Password: Admin@MBG2025
```

### Provincial Admin (Jakarta):
```
Email: kepala.disdik.dki-jakarta@mbg.id
Password: Admin@MBG2025
```

### Kabupaten Admin (Bandung):
```
Email: kepala.disdik.bandung@mbg.id
Password: Admin@MBG2025
```

### Staff Monitoring:
```
Email: staff.monitoring.dki-jakarta@mbg.id
Password: Admin@MBG2025
```

---

## 🛠️ Troubleshooting

### Error: "No deliveries found"
**Solution**: Jalankan seeding deliveries dulu:
```bash
npx ts-node database/seeders/04-seed-deliveries.ts
```

### Error: "Missing Supabase credentials"
**Solution**: Pastikan `.env` file sudah ada dengan:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Error: "Table does not exist"
**Solution**: Upload migration files ke Supabase SQL Editor terlebih dahulu

### Warning: "Duplicate email"
**Solution**: Hapus data existing terlebih dahulu atau skip seeding yang sudah ada

---

## 📝 Notes

1. **Default passwords**: Semua admin menggunakan password yang sama (`Admin@MBG2025`). Dalam production, sebaiknya gunakan password unik dan harus diganti saat first login.

2. **Blockchain data**: Transaction hashes dan block numbers adalah **simulated data**. Dalam production, data ini akan diisi dari real blockchain transactions.

3. **Performance**: Seeding dilakukan dalam batches (100 records per batch) untuk menghindari timeout dan memory issues.

4. **Stats logging**: Setiap seeding menghasilkan file stats dalam format JSON di folder `database/seeding-logs/` untuk tracking dan debugging.

5. **RLS (Row Level Security)**: Migration sudah include RLS policies untuk security. Pastikan configure `app.current_user_id` setting saat query dari aplikasi.

6. **Idempotency**: Seeding scripts tidak idempotent. Jangan jalankan 2× kecuali sudah clear data terlebih dahulu.

---

## 📚 References

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL JSON Functions](https://www.postgresql.org/docs/current/functions-json.html)
- [bcrypt Documentation](https://github.com/kelektiv/node.bcrypt.js)

---

## ✅ Checklist

Sebelum running seeding, pastikan:

- [ ] Supabase project sudah setup
- [ ] Environment variables sudah configured
- [ ] Base tables sudah ada (users, schools, caterings, deliveries)
- [ ] Migration files sudah di-upload ke Supabase
- [ ] Dependencies sudah installed (`npm install`)
- [ ] Base seeding (01, 02, 04) sudah running
- [ ] Backup database jika production

---

**Happy Seeding! 🌱**
