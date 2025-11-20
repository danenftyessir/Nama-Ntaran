/**
 * ============================================================================
 * SEEDING SCRIPT 01: USERS & AUTHENTICATION
 * ============================================================================
 *
 * Purpose: Seed users + schools + caterings tables with normalized data
 * Dependencies:
 *   - @supabase/supabase-js
 *   - bcrypt
 *   - csv-parser
 *   - dotenv
 *
 * Run: npx ts-node database/seeders/01-seed-users.ts
 */

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcrypt'
import fs from 'fs'
import csv from 'csv-parser'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config()

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface SchoolCSVRow {
  No: string
  NPSN: string
  NPSN_URL: string
  'Nama Satuan Pendidikan': string
  Alamat: string
  Kelurahan: string
  Status: string
  kode_kecamatan: string
  provinsi: string
  kabupaten: string
  kecamatan: string
  jenjang: string
  kecamatan_url: string
  source_url: string
}

// Database table interfaces (matching schema.sql)
interface UserInsert {
  email: string
  password_hash: string
  role: 'admin' | 'government' | 'school' | 'catering'
  is_active: boolean
}

interface SchoolInsert {
  npsn: string
  name: string
  address: string | null
  kelurahan: string | null
  status: string | null
  kode_kecamatan: string | null
  province: string
  city: string
  district: string | null
  jenjang: string | null
  npsn_url: string | null
  kecamatan_url: string | null
  source_url: string | null
  priority_score: number
  latitude: number | null
  longitude: number | null
  // contact_name removed - column doesn't exist in actual database
  user_id: number
}

interface CateringInsert {
  name: string
  company_name: string | null
  wallet_address: string
  phone: string
  email: string
  address: string | null
  rating: number
  total_deliveries: number
  user_id: number
}

interface SeedingStats {
  totalSchools: number
  totalCaterings: number
  totalAdmins: number
  successSchools: number
  successCaterings: number
  successAdmins: number
  failedSchools: number
  failedCaterings: number
  failedAdmins: number
  errors: Array<{ type: string; batch?: number; error?: string; message?: string; count?: number; data?: any }>
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // CSV Paths
  CSV_DIKDAS_PATH: path.join(__dirname, '../detail_sekolah_dikdas_20251113_022936.csv'),
  CSV_DIKMEN_PATH: path.join(__dirname, '../detail_sekolah_dikmen_20251113_080033.csv'),

  // Test Mode - Set to true for testing with small sample
  TEST_MODE: false, // Change to false for full seeding
  TEST_SCHOOLS: 3, // Number of schools to seed in test mode
  TEST_CATERINGS: 2, // Number of caterings to seed in test mode
  TEST_ADMINS: 2, // Number of admins to seed in test mode

  // Seeding Options (used when TEST_MODE = false)
  BATCH_SIZE: 50,
  CATERING_COUNT: 100,
  ADMINS_PER_REGION: 2,
  MAX_SCHOOLS_DIKDAS: 15000,
  MAX_SCHOOLS_DIKMEN: 15000,

  // Password Options
  BCRYPT_ROUNDS: 10,
  DEFAULT_SCHOOL_PASSWORD: 'school123',
  DEFAULT_CATERING_PASSWORD: 'catering123',
  DEFAULT_ADMIN_PASSWORD: 'Admin@MBG2025',

  // Phone number format
  PHONE_PREFIXES: ['0812', '0813', '0821', '0822', '0851', '0852'],
}

// ============================================================================
// UTILITIES
// ============================================================================

class Logger {
  private startTime: number = Date.now()

  log(message: string, data?: any) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2)
    console.log(`[${elapsed}s] ${message}`)
    if (data) {
      console.log(JSON.stringify(data, null, 2))
    }
  }

  error(message: string, error?: any) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2)
    console.error(`[${elapsed}s] ❌ ERROR: ${message}`)
    if (error) {
      console.error(error)
    }
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
// PASSWORD UTILITIES
// ============================================================================

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, CONFIG.BCRYPT_ROUNDS)
}

// ============================================================================
// PHONE NUMBER GENERATOR
// ============================================================================

function generatePhoneNumber(): string {
  const prefix = CONFIG.PHONE_PREFIXES[Math.floor(Math.random() * CONFIG.PHONE_PREFIXES.length)]
  const middle = Math.floor(1000 + Math.random() * 9000)
  const last = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${middle}-${last}`
}

// ============================================================================
// ETHEREUM ADDRESS GENERATOR
// ============================================================================

function generateEthereumAddress(): string {
  const chars = '0123456789abcdef'
  let address = '0x'
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * chars.length)]
  }
  return address
}

// ============================================================================
// CSV READER
// ============================================================================

async function readSchoolsFromCSV(csvPath: string): Promise<SchoolCSVRow[]> {
  return new Promise((resolve, reject) => {
    const schools: SchoolCSVRow[] = []

    if (!fs.existsSync(csvPath)) {
      reject(new Error(`CSV file not found: ${csvPath}`))
      return
    }

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row: SchoolCSVRow) => {
        schools.push(row)
      })
      .on('end', () => {
        resolve(schools)
      })
      .on('error', (error) => {
        reject(error)
      })
  })
}

function sampleSchoolsByProvince(schools: SchoolCSVRow[], maxCount: number): SchoolCSVRow[] {
  const provinceMap = new Map<string, SchoolCSVRow[]>()

  for (const school of schools) {
    if (school.provinsi) {
      if (!provinceMap.has(school.provinsi)) {
        provinceMap.set(school.provinsi, [])
      }
      provinceMap.get(school.provinsi)!.push(school)
    }
  }

  const provinces = Array.from(provinceMap.keys())
  logger.log(`Found ${provinces.length} unique provinces`)

  if (schools.length <= maxCount) {
    return schools
  }

  const sampledSchools: SchoolCSVRow[] = []
  const minPerProvince = Math.floor(maxCount / provinces.length)
  let remainingSlots = maxCount

  const provinceSamples = new Map<string, SchoolCSVRow[]>()

  for (const [province, provinceSchools] of provinceMap.entries()) {
    const sampleSize = Math.min(minPerProvince, provinceSchools.length)
    const sampled = provinceSchools.slice(0, sampleSize)
    provinceSamples.set(province, sampled)
    remainingSlots -= sampleSize
  }

  if (remainingSlots > 0) {
    const totalSchools = schools.length

    for (const [province, provinceSchools] of provinceMap.entries()) {
      const currentSample = provinceSamples.get(province)!
      const alreadySampled = currentSample.length
      const available = provinceSchools.length - alreadySampled

      if (available > 0) {
        const proportion = provinceSchools.length / totalSchools
        const additionalSlots = Math.floor(remainingSlots * proportion)
        const toTake = Math.min(additionalSlots, available)

        if (toTake > 0) {
          const additional = provinceSchools.slice(alreadySampled, alreadySampled + toTake)
          currentSample.push(...additional)
        }
      }
    }
  }

  for (const sample of provinceSamples.values()) {
    sampledSchools.push(...sample)
  }

  logger.log(`Sampled ${sampledSchools.length} schools (target: ${maxCount})`)
  return sampledSchools
}

async function readAllSchoolsFromCSV(): Promise<SchoolCSVRow[]> {
  if (CONFIG.TEST_MODE) {
    logger.log(`⚠️  TEST MODE ENABLED - Reading only ${CONFIG.TEST_SCHOOLS} schools`)
    const dikdasSchools = await readSchoolsFromCSV(CONFIG.CSV_DIKDAS_PATH)
    logger.success(`✅ Read ${dikdasSchools.length} schools from dikdas CSV`)

    // Return only the first few schools for testing
    const testSchools = dikdasSchools.slice(0, CONFIG.TEST_SCHOOLS)
    logger.success(`✅ Using ${testSchools.length} schools for testing`)
    return testSchools
  }

  logger.log('Reading schools from dikdas CSV...')
  const dikdasSchools = await readSchoolsFromCSV(CONFIG.CSV_DIKDAS_PATH)
  logger.success(`✅ Read ${dikdasSchools.length} schools from dikdas CSV`)

  logger.log('Reading schools from dikmen CSV...')
  const dikmenSchools = await readSchoolsFromCSV(CONFIG.CSV_DIKMEN_PATH)
  logger.success(`✅ Read ${dikmenSchools.length} schools from dikmen CSV`)

  logger.log('\nSampling schools to ensure all provinces are represented...')

  logger.log('Sampling dikdas schools...')
  const sampledDikdas = sampleSchoolsByProvince(dikdasSchools, CONFIG.MAX_SCHOOLS_DIKDAS)

  logger.log('Sampling dikmen schools...')
  const sampledDikmen = sampleSchoolsByProvince(dikmenSchools, CONFIG.MAX_SCHOOLS_DIKMEN)

  const allSchools = [...sampledDikdas, ...sampledDikmen]
  logger.success(`✅ Total schools after sampling: ${allSchools.length}`)
  logger.success(`   - Dikdas: ${sampledDikdas.length}`)
  logger.success(`   - Dikmen: ${sampledDikmen.length}`)

  return allSchools
}

// ============================================================================
// DATA GENERATORS
// ============================================================================

interface SchoolData {
  user: UserInsert
  school: Omit<SchoolInsert, 'user_id'>
}

async function generateSchoolData(csvRows: SchoolCSVRow[]): Promise<SchoolData[]> {
  logger.log('Generating school data from CSV...')

  const schoolData: SchoolData[] = []

  for (let i = 0; i < csvRows.length; i++) {
    const row = csvRows[i]

    if (!row.NPSN) {
      logger.error(`Skipping row ${i + 1}: Missing NPSN`, row)
      continue
    }

    try {
      const user: UserInsert = {
        email: `school_${row.NPSN}@mbg.id`,
        password_hash: await hashPassword(row.NPSN),
        role: 'school',
        is_active: true
      }

      const school: Omit<SchoolInsert, 'user_id'> = {
        npsn: row.NPSN,
        name: row['Nama Satuan Pendidikan'],
        address: row.Alamat || null,
        kelurahan: row.Kelurahan || null,
        status: row.Status || null,
        kode_kecamatan: row.kode_kecamatan || null,
        province: row.provinsi || '',
        city: row.kabupaten || '',
        district: row.kecamatan || null,
        jenjang: row.jenjang || null,
        npsn_url: row.NPSN_URL || null,
        kecamatan_url: row.kecamatan_url || null,
        source_url: row.source_url || null,
        priority_score: 0,
        latitude: null,
        longitude: null
        // contact_name removed - column doesn't exist in database
      }

      schoolData.push({ user, school })

      if ((i + 1) % 100 === 0) {
        logger.progress(i + 1, csvRows.length, 'Generating school data')
      }
    } catch (error) {
      logger.error(`Error generating data for school ${row.NPSN}`, error)
    }
  }

  logger.success(`Generated ${schoolData.length} school records`)
  return schoolData
}

interface CateringData {
  user: UserInsert
  catering: Omit<CateringInsert, 'user_id'>
}

async function generateCateringData(count: number): Promise<CateringData[]> {
  const actualCount = CONFIG.TEST_MODE ? CONFIG.TEST_CATERINGS : count
  logger.log(`Generating ${actualCount} catering records...${CONFIG.TEST_MODE ? ' (TEST MODE)' : ''}`)

  const cateringData: CateringData[] = []

  const cateringNames = [
    'PT Sumber Pangan Sehat', 'CV Gizi Nusantara', 'PT Boga Rasa Indonesia',
    'CV Sehat Selalu Catering', 'PT Cita Rasa Nusantara', 'CV Makan Bergizi',
    'PT Nutrisi Prima', 'CV Katering Sehat Mandiri', 'PT Anugrah Boga',
    'CV Dapur Sehat', 'PT Mitra Gizi Sejahtera', 'CV Katering Nusantara',
    'PT Berkah Food Services', 'CV Sari Rasa Catering', 'PT Griya Katering Sehat',
    'CV Dapur Bergizi', 'PT Nutrisi Bangsa', 'CV Katering Prima',
    'PT Sumber Gizi Mandiri', 'CV Boga Sehat', 'PT Katering Nusantara Sejahtera',
    'CV Gizi Seimbang', 'PT Makanan Sehat Indonesia', 'CV Katering Berkah',
    'PT Nutrisi Optimal', 'CV Dapur Nusantara', 'PT Boga Sejahtera',
    'CV Katering Sehat Bersama', 'PT Gizi Prima Indonesia', 'CV Makanan Bergizi',
    'PT Katering Profesional', 'CV Nutrisi Keluarga', 'PT Boga Nusantara',
    'CV Dapur Profesional', 'PT Katering Berkualitas', 'CV Gizi Optimal',
    'PT Makanan Sehat Nusantara', 'CV Katering Indonesia', 'PT Nutrisi Terbaik',
    'CV Boga Indonesia', 'PT Katering Terpercaya', 'CV Gizi Indonesia',
    'PT Makanan Bergizi Nusantara', 'CV Dapur Terpercaya', 'PT Katering Sehat Indonesia',
    'CV Nutrisi Nusantara', 'PT Boga Terbaik', 'CV Katering Terbaik',
    'PT Gizi Nusantara Sejahtera', 'CV Makanan Sehat Sejahtera',
    'PT Katering Nusantara Prima', 'CV Nutrisi Prima Indonesia', 'PT Boga Berkah',
    'CV Dapur Berkah', 'PT Katering Sejahtera', 'CV Gizi Sejahtera',
    'PT Makanan Nusantara', 'CV Katering Optimal', 'PT Nutrisi Berkah',
    'CV Boga Optimal', 'PT Katering Indonesia Sejahtera', 'CV Gizi Terbaik',
    'PT Makanan Optimal', 'CV Dapur Optimal', 'PT Katering Nusantara Terbaik',
    'CV Nutrisi Sehat', 'PT Boga Prima', 'CV Katering Berkah Sejahtera',
    'PT Gizi Berkah', 'CV Makanan Prima', 'PT Katering Prima Sejahtera',
    'CV Nutrisi Optimal Indonesia', 'PT Boga Sejahtera Indonesia',
    'CV Dapur Sejahtera', 'PT Katering Sehat Terpercaya', 'CV Gizi Prima Nusantara',
    'PT Makanan Terpercaya', 'CV Katering Sehat Optimal', 'PT Nutrisi Indonesia',
    'CV Boga Nusantara Sejahtera', 'PT Katering Berkah Indonesia',
    'CV Gizi Sehat Indonesia', 'PT Makanan Sehat Prima', 'CV Dapur Prima',
    'PT Katering Optimal Indonesia', 'CV Nutrisi Berkah Sejahtera',
    'PT Boga Terpercaya', 'CV Katering Indonesia Prima', 'PT Gizi Sehat Nusantara',
    'CV Makanan Berkah', 'PT Katering Terbaik Indonesia',
    'CV Nutrisi Nusantara Sejahtera', 'PT Boga Sehat Indonesia',
    'CV Dapur Indonesia', 'PT Katering Sehat Sejahtera', 'CV Gizi Nusantara Prima',
    'PT Makanan Sejahtera', 'CV Katering Nusantara Berkah',
    'PT Nutrisi Sejahtera Indonesia', 'CV Boga Berkah Indonesia',
  ]

  const hashedPassword = await hashPassword(CONFIG.DEFAULT_CATERING_PASSWORD)

  for (let i = 0; i < actualCount && i < cateringNames.length; i++) {
    const name = cateringNames[i]
    const slug = name
      .toLowerCase()
      .replace(/pt |cv /gi, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    const user: UserInsert = {
      email: `${slug}@catering.mbg.id`,
      password_hash: hashedPassword,
      role: 'catering',
      is_active: true
    }

    const catering: Omit<CateringInsert, 'user_id'> = {
      name: name,
      company_name: name,
      wallet_address: generateEthereumAddress(),
      phone: generatePhoneNumber(),
      email: `${slug}@catering.mbg.id`,
      address: null,
      rating: 0,
      total_deliveries: 0
    }

    cateringData.push({ user, catering })

    if ((i + 1) % 20 === 0) {
      logger.progress(i + 1, actualCount, 'Generating catering data')
    }
  }

  logger.success(`Generated ${cateringData.length} catering records`)
  return cateringData
}

async function generateAdminData(csvRows: SchoolCSVRow[]): Promise<UserInsert[]> {
  if (CONFIG.TEST_MODE) {
    logger.log(`⚠️  TEST MODE - Generating only ${CONFIG.TEST_ADMINS} admin users`)
    const admins: UserInsert[] = []
    const hashedPassword = await hashPassword(CONFIG.DEFAULT_ADMIN_PASSWORD)

    for (let i = 1; i <= CONFIG.TEST_ADMINS; i++) {
      admins.push({
        email: `admin.test.${i}@mbg.id`,
        password_hash: hashedPassword,
        role: 'admin',
        is_active: true
      })
    }

    logger.success(`Generated ${admins.length} test admin users`)
    return admins
  }

  logger.log('Generating admin users from kabupaten data...')

  const admins: UserInsert[] = []
  const hashedPassword = await hashPassword(CONFIG.DEFAULT_ADMIN_PASSWORD)

  const kabupatenMap = new Map<string, { provinsi: string; count: number }>()

  for (const row of csvRows) {
    if (row.kabupaten && row.provinsi) {
      const key = `${row.provinsi}|${row.kabupaten}`
      if (!kabupatenMap.has(key)) {
        kabupatenMap.set(key, { provinsi: row.provinsi, count: 0 })
      }
    }
  }

  logger.log(`Found ${kabupatenMap.size} unique kabupaten`)

  for (const [key, data] of kabupatenMap.entries()) {
    const [_provinsi, kabupaten] = key.split('|')

    if (data.count >= CONFIG.ADMINS_PER_REGION) {
      continue
    }

    const kabupatenSlug = kabupaten
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    for (let i = 1; i <= CONFIG.ADMINS_PER_REGION; i++) {
      const user: UserInsert = {
        email: `admin.${kabupatenSlug}.${i}@mbg.id`,
        password_hash: hashedPassword,
        role: 'admin',
        is_active: true
      }

      admins.push(user)
      data.count++
    }
  }

  logger.success(`Generated ${admins.length} admin users from ${kabupatenMap.size} kabupaten`)
  return admins
}

// ============================================================================
// SUPABASE OPERATIONS
// ============================================================================

async function insertSchoolsInBatches(
  supabase: any,
  schoolData: SchoolData[],
  batchSize: number
): Promise<{ success: number; failed: number; errors: any[] }> {
  let success = 0
  let failed = 0
  const errors: any[] = []

  const totalBatches = Math.ceil(schoolData.length / batchSize)
  logger.log(`Inserting ${schoolData.length} schools in ${totalBatches} batches...`)

  for (let i = 0; i < schoolData.length; i += batchSize) {
    const batch = schoolData.slice(i, i + batchSize)
    const batchNumber = Math.floor(i / batchSize) + 1

    try {
      // Step 1: Insert users
      const users = batch.map(s => s.user)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert(users)
        .select('id, email')

      if (userError || !userData || userData.length === 0) {
        logger.error(`Batch ${batchNumber} failed at user insert`, userError)
        failed += batch.length
        errors.push({
          batch: batchNumber,
          error: userError?.message || 'No user data returned',
          count: batch.length
        })
        continue
      }

      // Step 2: Insert schools with user_ids
      const schools = batch.map((s, idx) => ({
        ...s.school,
        user_id: userData[idx].id
      }))

      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .insert(schools)
        .select()

      if (schoolError) {
        logger.error(`Batch ${batchNumber} failed at school insert`, schoolError)
        failed += batch.length
        errors.push({
          batch: batchNumber,
          error: schoolError.message,
          count: batch.length
        })
      } else {
        success += schoolData.length
        logger.progress(
          Math.min(i + batchSize, schoolData.length),
          schoolData.length,
          'Inserting schools'
        )
      }
    } catch (error) {
      logger.error(`Batch ${batchNumber} exception`, error)
      failed += batch.length
      errors.push({
        batch: batchNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
        count: batch.length
      })
    }

    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return { success, failed, errors }
}

async function insertCateringsInBatches(
  supabase: any,
  cateringData: CateringData[],
  batchSize: number
): Promise<{ success: number; failed: number; errors: any[] }> {
  let success = 0
  let failed = 0
  const errors: any[] = []

  const totalBatches = Math.ceil(cateringData.length / batchSize)
  logger.log(`Inserting ${cateringData.length} caterings in ${totalBatches} batches...`)

  for (let i = 0; i < cateringData.length; i += batchSize) {
    const batch = cateringData.slice(i, i + batchSize)
    const batchNumber = Math.floor(i / batchSize) + 1

    try {
      // Step 1: Insert users
      const users = batch.map(c => c.user)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert(users)
        .select('id, email')

      if (userError || !userData || userData.length === 0) {
        logger.error(`Batch ${batchNumber} failed at user insert`, userError)
        failed += batch.length
        errors.push({
          batch: batchNumber,
          error: userError?.message || 'No user data returned',
          count: batch.length
        })
        continue
      }

      // Step 2: Insert caterings with user_ids
      const caterings = batch.map((c, idx) => ({
        ...c.catering,
        user_id: userData[idx].id
      }))

      const { data: cateringData, error: cateringError } = await supabase
        .from('caterings')
        .insert(caterings)
        .select()

      if (cateringError) {
        logger.error(`Batch ${batchNumber} failed at catering insert`, cateringError)
        failed += batch.length
        errors.push({
          batch: batchNumber,
          error: cateringError.message,
          count: batch.length
        })
      } else {
        success += cateringData.length
        logger.progress(
          Math.min(i + batchSize, cateringData.length),
          cateringData.length,
          'Inserting caterings'
        )
      }
    } catch (error) {
      logger.error(`Batch ${batchNumber} exception`, error)
      failed += batch.length
      errors.push({
        batch: batchNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
        count: batch.length
      })
    }

    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return { success, failed, errors }
}

async function insertAdminsInBatches(
  supabase: any,
  admins: UserInsert[],
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
          batch: batchNumber,
          error: error.message,
          count: batch.length
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
        batch: batchNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
        count: batch.length
      })
    }

    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return { success, failed, errors }
}

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function seedUsers() {
  logger.log('='.repeat(80))
  logger.log('SEEDING SCRIPT 01: USERS & AUTHENTICATION')
  if (CONFIG.TEST_MODE) {
    logger.log('⚠️  TEST MODE ENABLED - Limited data seeding')
  }
  logger.log('='.repeat(80))

  const stats: SeedingStats = {
    totalSchools: 0,
    totalCaterings: 0,
    totalAdmins: 0,
    successSchools: 0,
    successCaterings: 0,
    successAdmins: 0,
    failedSchools: 0,
    failedCaterings: 0,
    failedAdmins: 0,
    errors: []
  }

  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_SERVICE_KEY) {
    logger.error('Missing Supabase credentials in environment variables')
    process.exit(1)
  }

  logger.log('Initializing Supabase client...')
  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  logger.success('Supabase client initialized')

  try {
    // ========================================================================
    // STEP 1: Generate and Insert School Data
    // ========================================================================
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 1: GENERATING SCHOOL DATA FROM CSV (DIKDAS + DIKMEN)')
    logger.log('='.repeat(80))

    const csvRows = await readAllSchoolsFromCSV()
    const schoolData = await generateSchoolData(csvRows)
    stats.totalSchools = schoolData.length

    const schoolResult = await insertSchoolsInBatches(
      supabase,
      schoolData,
      CONFIG.BATCH_SIZE
    )
    stats.successSchools = schoolResult.success
    stats.failedSchools = schoolResult.failed
    stats.errors.push(...schoolResult.errors.map(e => ({ type: 'school', ...e })))

    // ========================================================================
    // STEP 2: Generate and Insert Catering Data
    // ========================================================================
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 2: GENERATING CATERING DATA')
    logger.log('='.repeat(80))

    stats.totalCaterings = CONFIG.CATERING_COUNT
    const cateringData = await generateCateringData(CONFIG.CATERING_COUNT)

    const cateringResult = await insertCateringsInBatches(
      supabase,
      cateringData,
      CONFIG.BATCH_SIZE
    )
    stats.successCaterings = cateringResult.success
    stats.failedCaterings = cateringResult.failed
    stats.errors.push(...cateringResult.errors.map(e => ({ type: 'catering', ...e })))

    // ========================================================================
    // STEP 3: Generate and Insert Admin Users
    // ========================================================================
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 3: GENERATING ADMIN USERS FROM KABUPATEN')
    logger.log('='.repeat(80))

    const adminData = await generateAdminData(csvRows)
    stats.totalAdmins = adminData.length

    const adminResult = await insertAdminsInBatches(
      supabase,
      adminData,
      CONFIG.BATCH_SIZE
    )
    stats.successAdmins = adminResult.success
    stats.failedAdmins = adminResult.failed
    stats.errors.push(...adminResult.errors.map(e => ({ type: 'admin', ...e })))

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    logger.log('\n' + '='.repeat(80))
    logger.log('SEEDING SUMMARY')
    logger.log('='.repeat(80))

    const totalUsers = stats.totalSchools + stats.totalCaterings + stats.totalAdmins
    const totalSuccess = stats.successSchools + stats.successCaterings + stats.successAdmins
    const totalFailed = stats.failedSchools + stats.failedCaterings + stats.failedAdmins

    console.log(`
📊 SCHOOL USERS:
   Total: ${stats.totalSchools}
   ✅ Success: ${stats.successSchools}
   ❌ Failed: ${stats.failedSchools}
   Success Rate: ${((stats.successSchools / stats.totalSchools) * 100).toFixed(1)}%

📊 CATERING USERS:
   Total: ${stats.totalCaterings}
   ✅ Success: ${stats.successCaterings}
   ❌ Failed: ${stats.failedCaterings}
   Success Rate: ${((stats.successCaterings / stats.totalCaterings) * 100).toFixed(1)}%

📊 ADMIN USERS:
   Total: ${stats.totalAdmins}
   ✅ Success: ${stats.successAdmins}
   ❌ Failed: ${stats.failedAdmins}
   Success Rate: ${((stats.successAdmins / stats.totalAdmins) * 100).toFixed(1)}%

📊 OVERALL:
   Total Users: ${totalUsers}
   ✅ Successfully Inserted: ${totalSuccess}
   ❌ Failed: ${totalFailed}
   Success Rate: ${((totalSuccess / totalUsers) * 100).toFixed(1)}%
`)

    if (stats.errors.length > 0) {
      logger.log('\n❌ ERRORS ENCOUNTERED:')
      stats.errors.slice(0, 10).forEach((err, index) => {
        const errorMsg = err.error || err.message || 'Unknown error'
        console.log(`${index + 1}. [${err.type}] Batch ${err.batch}: ${errorMsg}`)
      })
      if (stats.errors.length > 10) {
        logger.log(`... and ${stats.errors.length - 10} more errors`)
      }
    }

    logger.log('\n' + '='.repeat(80))
    logger.success('SEEDING COMPLETED!')
    logger.log('='.repeat(80))

    const statsPath = path.join(__dirname, '../seeding-logs/01-users-stats.json')
    fs.mkdirSync(path.dirname(statsPath), { recursive: true })
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2))
    logger.log(`\nStats saved to: ${statsPath}`)

  } catch (error) {
    logger.error('Fatal error during seeding', error)
    process.exit(1)
  }
}

// ============================================================================
// EXECUTE
// ============================================================================

if (require.main === module) {
  seedUsers()
    .then(() => {
      logger.success('Script execution completed')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('Script execution failed', error)
      process.exit(1)
    })
}

export { seedUsers }
