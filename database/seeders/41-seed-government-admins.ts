/**
 * ============================================================================
 * SEEDING SCRIPT 41: GOVERNMENT ADMINS (PEMERINTAH)
 * ============================================================================
 *
 * Purpose: Seed admin users untuk pemerintah daerah (Dinas Pendidikan)
 * Dependencies:
 *   - @supabase/supabase-js
 *   - bcrypt
 *   - dotenv
 *
 * Run: npx ts-node database/seeders/41-seed-government-admins.ts
 *
 * Data yang dibuat:
 * - Admin tingkat provinsi (Kepala Dinas Pendidikan Provinsi)
 * - Admin tingkat kabupaten/kota (Kepala Dinas Pendidikan Kabupaten/Kota)
 * - Staff admin untuk monitoring dan verifikasi
 */

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface AdminUserInsert {
  email: string
  password_hash: string
  role: 'admin' | 'government'
  is_active: boolean
}

interface AdminProfile {
  user_id: number
  full_name: string
  position: string // 'Kepala Dinas', 'Kabid', 'Kasubid', 'Staff'
  level: string // 'provinsi', 'kabupaten', 'kota'
  region_name: string // Nama provinsi/kabupaten/kota
  phone: string
  office_address: string
  nip?: string // Nomor Induk Pegawai
}

interface SeedingStats {
  totalAdmins: number
  successAdmins: number
  failedAdmins: number
  byLevel: Record<string, number>
  byPosition: Record<string, number>
  errors: Array<{ type: string; error?: string; data?: any }>
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Password
  BCRYPT_ROUNDS: 10,
  DEFAULT_PASSWORD: 'Admin@MBG2025', // Will be hashed

  // Admin per region
  ADMINS_PER_PROVINSI: 3, // Kepala Dinas + 2 staff
  ADMINS_PER_KABUPATEN: 2, // Kepala Dinas + 1 staff

  BATCH_SIZE: 50,

  // Phone prefixes
  PHONE_PREFIXES: ['0812', '0813', '0821', '0822', '0851', '0852'],
}

// Data provinsi Indonesia
const PROVINCES = [
  'DKI Jakarta',
  'Jawa Barat',
  'Jawa Tengah',
  'Jawa Timur',
  'DI Yogyakarta',
  'Banten',
  'Sumatera Utara',
  'Sumatera Barat',
  'Sumatera Selatan',
  'Riau',
  'Kepulauan Riau',
  'Jambi',
  'Bengkulu',
  'Lampung',
  'Bangka Belitung',
  'Aceh',
  'Kalimantan Barat',
  'Kalimantan Tengah',
  'Kalimantan Selatan',
  'Kalimantan Timur',
  'Kalimantan Utara',
  'Sulawesi Utara',
  'Sulawesi Tengah',
  'Sulawesi Selatan',
  'Sulawesi Tenggara',
  'Sulawesi Barat',
  'Gorontalo',
  'Maluku',
  'Maluku Utara',
  'Bali',
  'Nusa Tenggara Barat',
  'Nusa Tenggara Timur',
  'Papua',
  'Papua Barat',
  'Papua Selatan',
  'Papua Tengah',
  'Papua Pegunungan',
  'Papua Barat Daya',
]

const KABUPATEN_MAP: Record<string, string[]> = {
  'DKI Jakarta': ['Jakarta Pusat', 'Jakarta Selatan', 'Jakarta Timur', 'Jakarta Barat', 'Jakarta Utara', 'Kepulauan Seribu'],
  'Jawa Barat': ['Bandung', 'Bekasi', 'Bogor', 'Depok', 'Cimahi', 'Sukabumi', 'Cirebon', 'Tasikmalaya', 'Garut', 'Cianjur', 'Purwakarta', 'Subang', 'Karawang', 'Indramayu', 'Kuningan', 'Majalengka', 'Sumedang'],
  'Jawa Tengah': ['Semarang', 'Surakarta', 'Magelang', 'Salatiga', 'Pekalongan', 'Tegal', 'Cilacap', 'Purwokerto', 'Kebumen', 'Klaten', 'Boyolali', 'Wonogiri', 'Karanganyar', 'Sukoharjo'],
  'Jawa Timur': ['Surabaya', 'Malang', 'Kediri', 'Madiun', 'Pasuruan', 'Probolinggo', 'Blitar', 'Mojokerto', 'Jember', 'Banyuwangi', 'Sidoarjo', 'Gresik', 'Lamongan', 'Tuban'],
  'Banten': ['Tangerang', 'Tangerang Selatan', 'Serang', 'Cilegon', 'Pandeglang', 'Lebak'],
  'DI Yogyakarta': ['Yogyakarta', 'Sleman', 'Bantul', 'Kulon Progo', 'Gunung Kidul'],
  'Sumatera Utara': ['Medan', 'Binjai', 'Tebing Tinggi', 'Pematangsiantar', 'Tanjung Balai', 'Deli Serdang', 'Serdang Bedagai'],
  'Sumatera Barat': ['Padang', 'Bukittinggi', 'Payakumbuh', 'Padang Panjang', 'Solok', 'Agam', 'Tanah Datar'],
  'Sumatera Selatan': ['Palembang', 'Prabumulih', 'Lubuklinggau', 'Pagar Alam', 'Ogan Ilir', 'Muara Enim'],
}

const ADMIN_POSITIONS = [
  'Kepala Dinas Pendidikan',
  'Kabid Program dan Anggaran',
  'Kabid Pembinaan SD',
  'Kabid Pembinaan SMP',
  'Kasubid Gizi dan Kesehatan',
  'Staff Monitoring dan Evaluasi',
]

// ============================================================================
// UTILITIES
// ============================================================================

class Logger {
  private startTime: number = Date.now()

  log(message: string) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2)
    console.log(`[${elapsed}s] ${message}`)
  }

  error(message: string, error?: any) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2)
    console.error(`[${elapsed}s] ❌ ERROR: ${message}`)
    if (error) console.error(error)
  }

  success(message: string) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2)
    console.log(`[${elapsed}s] ✅ ${message}`)
  }

  progress(current: number, total: number, label: string) {
    const percentage = ((current / total) * 100).toFixed(1)
    const bar = this.generateProgressBar(current, total)
    console.log(`${bar} ${percentage}% - ${label} (${current}/${total})`)
  }

  private generateProgressBar(current: number, total: number, length: number = 30): string {
    const filled = Math.floor((current / total) * length)
    const empty = length - filled
    return `[${'█'.repeat(filled)}${' '.repeat(empty)}]`
  }
}

const logger = new Logger()

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, CONFIG.BCRYPT_ROUNDS)
}

function generatePhoneNumber(): string {
  const prefix = CONFIG.PHONE_PREFIXES[Math.floor(Math.random() * CONFIG.PHONE_PREFIXES.length)]
  const middle = Math.floor(1000 + Math.random() * 9000)
  const last = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${middle}-${last}`
}

function generateNIP(): string {
  // Format NIP: 18 digit (YYYYMMDD + 6 digit random)
  const year = Math.floor(1970 + Math.random() * 30) // 1970-2000
  const month = Math.floor(1 + Math.random() * 12).toString().padStart(2, '0')
  const day = Math.floor(1 + Math.random() * 28).toString().padStart(2, '0')
  const random = Math.floor(100000 + Math.random() * 900000)
  return `${year}${month}${day}${random}`
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

// ============================================================================
// DATA GENERATION
// ============================================================================

async function generateProvinsiAdmins(hashedPassword: string): Promise<AdminUserInsert[]> {
  logger.log(`Generating ${PROVINCES.length * CONFIG.ADMINS_PER_PROVINSI} provincial admins...`)

  const admins: AdminUserInsert[] = []

  for (const province of PROVINCES) {
    const provinceSlug = slugify(province)

    // Admin 1: Kepala Dinas
    admins.push({
      email: `kepala.disdik.${provinceSlug}@mbg.id`,
      password_hash: hashedPassword,
      role: 'government',
      is_active: true,
    })

    // Admin 2: Kabid Program
    admins.push({
      email: `kabid.program.${provinceSlug}@mbg.id`,
      password_hash: hashedPassword,
      role: 'government',
      is_active: true,
    })

    // Admin 3: Staff Monitoring
    admins.push({
      email: `staff.monitoring.${provinceSlug}@mbg.id`,
      password_hash: hashedPassword,
      role: 'admin',
      is_active: true,
    })
  }

  logger.success(`Generated ${admins.length} provincial admin users`)
  return admins
}

async function generateKabupatenAdmins(hashedPassword: string): Promise<AdminUserInsert[]> {
  logger.log('Generating kabupaten/kota admins...')

  const admins: AdminUserInsert[] = []

  for (const [province, kabupatens] of Object.entries(KABUPATEN_MAP)) {
    for (const kabupaten of kabupatens) {
      const kabupatenSlug = slugify(kabupaten)

      // Admin 1: Kepala Dinas Kabupaten
      admins.push({
        email: `kepala.disdik.${kabupatenSlug}@mbg.id`,
        password_hash: hashedPassword,
        role: 'government',
        is_active: true,
      })

      // Admin 2: Staff Kabupaten
      admins.push({
        email: `staff.${kabupatenSlug}@mbg.id`,
        password_hash: hashedPassword,
        role: 'admin',
        is_active: true,
      })
    }
  }

  logger.success(`Generated ${admins.length} kabupaten/kota admin users`)
  return admins
}

async function generateSystemAdmins(hashedPassword: string): Promise<AdminUserInsert[]> {
  logger.log('Generating system admins...')

  const admins: AdminUserInsert[] = [
    {
      email: 'superadmin@mbg.id',
      password_hash: hashedPassword,
      role: 'admin',
      is_active: true,
    },
    {
      email: 'admin@mbg.id',
      password_hash: hashedPassword,
      role: 'admin',
      is_active: true,
    },
    {
      email: 'admin.monitoring@mbg.id',
      password_hash: hashedPassword,
      role: 'admin',
      is_active: true,
    },
    {
      email: 'admin.finance@mbg.id',
      password_hash: hashedPassword,
      role: 'admin',
      is_active: true,
    },
    {
      email: 'admin.support@mbg.id',
      password_hash: hashedPassword,
      role: 'admin',
      is_active: true,
    },
  ]

  logger.success(`Generated ${admins.length} system admin users`)
  return admins
}

// ============================================================================
// SUPABASE OPERATIONS
// ============================================================================

async function insertAdminsInBatches(
  supabase: any,
  admins: AdminUserInsert[],
  batchSize: number
): Promise<{ success: number; failed: number; errors: any[] }> {
  let success = 0
  let failed = 0
  const errors: any[] = []

  const totalBatches = Math.ceil(admins.length / batchSize)
  logger.log(`Inserting ${admins.length} admin users in ${totalBatches} batches...`)

  for (let i = 0; i < admins.length; i += batchSize) {
    const batch = admins.slice(i, i + batchSize)
    const batchNumber = Math.floor(i / batchSize) + 1

    try {
      const { data, error } = await supabase
        .from('users')
        .insert(batch)
        .select()

      if (error) {
        logger.error(`Batch ${batchNumber} failed`, error)
        failed += batch.length
        errors.push({
          type: 'batch_insert',
          batch: batchNumber,
          error: error.message,
          count: batch.length,
        })
      } else {
        success += data.length
        logger.progress(
          Math.min(i + batchSize, admins.length),
          admins.length,
          'Inserting admins'
        )
      }
    } catch (error) {
      logger.error(`Batch ${batchNumber} exception`, error)
      failed += batch.length
      errors.push({
        type: 'exception',
        batch: batchNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
        count: batch.length,
      })
    }

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return { success, failed, errors }
}

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function seedGovernmentAdmins() {
  logger.log('='.repeat(80))
  logger.log('SEEDING SCRIPT 41: GOVERNMENT ADMINS (PEMERINTAH)')
  logger.log('='.repeat(80))

  const stats: SeedingStats = {
    totalAdmins: 0,
    successAdmins: 0,
    failedAdmins: 0,
    byLevel: {},
    byPosition: {},
    errors: [],
  }

  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_SERVICE_KEY) {
    logger.error('Missing Supabase credentials in environment variables')
    process.exit(1)
  }

  logger.log('Initializing Supabase client...')
  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  logger.success('Supabase client initialized')

  try {
    // Hash password once for all admins
    logger.log('Hashing password...')
    const hashedPassword = await hashPassword(CONFIG.DEFAULT_PASSWORD)
    logger.success('Password hashed')

    // ========================================================================
    // STEP 1: Generate System Admins
    // ========================================================================
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 1: GENERATING SYSTEM ADMINS')
    logger.log('='.repeat(80))

    const systemAdmins = await generateSystemAdmins(hashedPassword)
    stats.byLevel['system'] = systemAdmins.length

    // ========================================================================
    // STEP 2: Generate Provincial Admins
    // ========================================================================
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 2: GENERATING PROVINCIAL ADMINS (DINAS PENDIDIKAN PROVINSI)')
    logger.log('='.repeat(80))

    const provinsiAdmins = await generateProvinsiAdmins(hashedPassword)
    stats.byLevel['provinsi'] = provinsiAdmins.length

    // ========================================================================
    // STEP 3: Generate Kabupaten/Kota Admins
    // ========================================================================
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 3: GENERATING KABUPATEN/KOTA ADMINS')
    logger.log('='.repeat(80))

    const kabupatenAdmins = await generateKabupatenAdmins(hashedPassword)
    stats.byLevel['kabupaten'] = kabupatenAdmins.length

    // ========================================================================
    // STEP 4: Combine and Insert All Admins
    // ========================================================================
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 4: INSERTING ALL ADMIN USERS TO DATABASE')
    logger.log('='.repeat(80))

    const allAdmins = [...systemAdmins, ...provinsiAdmins, ...kabupatenAdmins]
    stats.totalAdmins = allAdmins.length

    logger.log(`Total admins to insert: ${allAdmins.length}`)
    logger.log(`  - System admins: ${systemAdmins.length}`)
    logger.log(`  - Provincial admins: ${provinsiAdmins.length}`)
    logger.log(`  - Kabupaten/Kota admins: ${kabupatenAdmins.length}`)

    const result = await insertAdminsInBatches(supabase, allAdmins, CONFIG.BATCH_SIZE)
    stats.successAdmins = result.success
    stats.failedAdmins = result.failed
    stats.errors = result.errors

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    logger.log('\n' + '='.repeat(80))
    logger.log('SEEDING SUMMARY')
    logger.log('='.repeat(80))

    console.log(`
📊 GOVERNMENT ADMINS:
   Total: ${stats.totalAdmins}
   ✅ Success: ${stats.successAdmins}
   ❌ Failed: ${stats.failedAdmins}
   Success Rate: ${((stats.successAdmins / stats.totalAdmins) * 100).toFixed(1)}%

📊 BY LEVEL:
   System: ${stats.byLevel['system'] || 0}
   Provinsi: ${stats.byLevel['provinsi'] || 0}
   Kabupaten/Kota: ${stats.byLevel['kabupaten'] || 0}
`)

    if (stats.errors.length > 0) {
      logger.log('\n❌ ERRORS ENCOUNTERED:')
      stats.errors.slice(0, 10).forEach((err, index) => {
        const errorMsg = err.error || 'Unknown error'
        console.log(`${index + 1}. [${err.type}] ${errorMsg}`)
      })
      if (stats.errors.length > 10) {
        logger.log(`... and ${stats.errors.length - 10} more errors`)
      }
    }

    logger.log('\n' + '='.repeat(80))
    logger.success('SEEDING COMPLETED!')
    logger.log('='.repeat(80))

    // Save stats
    const statsPath = path.join(__dirname, '../seeding-logs/41-government-admins-stats.json')
    fs.mkdirSync(path.dirname(statsPath), { recursive: true })
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2))
    logger.log(`\nStats saved to: ${statsPath}`)

    // Print sample credentials
    logger.log('\n' + '='.repeat(80))
    logger.log('SAMPLE ADMIN CREDENTIALS (for testing)')
    logger.log('='.repeat(80))
    console.log(`
Superadmin:
  Email: superadmin@mbg.id
  Password: ${CONFIG.DEFAULT_PASSWORD}

Admin Jakarta:
  Email: admin@mbg.id
  Password: ${CONFIG.DEFAULT_PASSWORD}

Kepala Dinas Provinsi DKI Jakarta:
  Email: kepala.disdik.dki-jakarta@mbg.id
  Password: ${CONFIG.DEFAULT_PASSWORD}

Kepala Dinas Kab/Kota Bandung:
  Email: kepala.disdik.bandung@mbg.id
  Password: ${CONFIG.DEFAULT_PASSWORD}

Staff Monitoring Jakarta:
  Email: staff.monitoring.dki-jakarta@mbg.id
  Password: ${CONFIG.DEFAULT_PASSWORD}
`)

  } catch (error) {
    logger.error('Fatal error during seeding', error)
    process.exit(1)
  }
}

// ============================================================================
// EXECUTE
// ============================================================================

if (require.main === module) {
  seedGovernmentAdmins()
    .then(() => {
      logger.success('Script execution completed')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('Script execution failed', error)
      process.exit(1)
    })
}

export { seedGovernmentAdmins }
