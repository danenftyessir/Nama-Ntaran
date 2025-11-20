/**
 * ============================================================================
 * SEEDING SCRIPT 04: DELIVERIES
 * ============================================================================
 *
 * Purpose: Seed deliveries table with 25,000-50,000 delivery records
 * Dependencies: 01-seed-users.ts, 02-seed-menu-items.ts (schools, caterings, menu_items must exist)
 *
 * Run: npx ts-node database/seeders/04-seed-deliveries.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

dotenv.config()

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface School {
  id: number
  name: string
  npsn: string
}

interface Catering {
  id: number
  name: string
}

interface MenuItem {
  id: number
  catering_id: number
  name: string
  price: number
  category: string
}

interface MenuItemOrder {
  menu_id: number
  menu_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

interface DeliveryInsert {
  school_id: number
  catering_id: number
  delivery_date: string
  delivery_time_start: string
  delivery_time_end: string
  portions: number
  menu_items: MenuItemOrder[]
  amount: number // Keep for backward compatibility
  total_amount: number
  status: string
  notes: string | null
  qr_code: string
  driver_name: string | null
  driver_phone: string | null
  vehicle_number: string | null
  delivered_at: string | null
}

interface SeedingStats {
  totalDeliveries: number
  successDeliveries: number
  failedDeliveries: number
  deliveriesByStatus: Record<string, number>
  deliveriesByMonth: Record<string, number>
  errors: Array<{ type: string; batch?: number; error?: string; count?: number }>
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Test Mode
  TEST_MODE: false,
  TEST_SCHOOLS: 50, // Number of schools in test mode
  TEST_DELIVERIES_PER_SCHOOL: 3, // Deliveries per school in test mode

  // Seeding Options
  BATCH_SIZE: 100,
  MIN_DELIVERIES_PER_SCHOOL: 5,
  MAX_DELIVERIES_PER_SCHOOL: 10,

  // Status Distribution
  STATUS_DISTRIBUTION: {
    verified: 0.60,    // 60%
    delivered: 0.20,   // 20%
    scheduled: 0.10,   // 10%
    pending: 0.05,     // 5%
    in_transit: 0.03,  // 3%
    cancelled: 0.02    // 2%
  },

  // Date Distribution
  DATE_DISTRIBUTION: {
    past_3_months: 0.70,   // 70%
    next_month: 0.20,      // 20%
    this_week: 0.10        // 10%
  },

  // Delivery Time Windows
  TIME_WINDOWS: [
    { name: 'Sarapan', start: '07:00', end: '08:30' },
    { name: 'Snack Pagi', start: '09:00', end: '10:00' },
    { name: 'Makan Siang', start: '11:00', end: '13:00' },
    { name: 'Snack Sore', start: '14:00', end: '15:30' }
  ],

  // Portion factor (percentage of students who eat)
  MIN_PORTION_FACTOR: 0.80,
  MAX_PORTION_FACTOR: 1.00,

  // Menu items per delivery
  MIN_MENU_ITEMS: 1,
  MAX_MENU_ITEMS: 3
}

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
// DATA GENERATORS
// ============================================================================

function getRandomStatus(): string {
  const random = Math.random()
  let cumulative = 0

  for (const [status, probability] of Object.entries(CONFIG.STATUS_DISTRIBUTION)) {
    cumulative += probability
    if (random <= cumulative) {
      return status
    }
  }

  return 'verified' // fallback
}

function generateDeliveryDate(): Date {
  const today = new Date()
  const random = Math.random()
  let cumulative = 0

  for (const [range, probability] of Object.entries(CONFIG.DATE_DISTRIBUTION)) {
    cumulative += probability
    if (random <= cumulative) {
      if (range === 'past_3_months') {
        // Random date in last 90 days
        const daysAgo = Math.floor(Math.random() * 90)
        const date = new Date(today)
        date.setDate(date.getDate() - daysAgo)
        return date
      } else if (range === 'next_month') {
        // Random date in next 30 days
        const daysAhead = Math.floor(Math.random() * 30) + 1
        const date = new Date(today)
        date.setDate(date.getDate() + daysAhead)
        return date
      } else { // this_week
        // Random date in next 7 days
        const daysAhead = Math.floor(Math.random() * 7)
        const date = new Date(today)
        date.setDate(date.getDate() + daysAhead)
        return date
      }
    }
  }

  return today // fallback
}

function getRandomTimeWindow(): { start: string; end: string } {
  const window = CONFIG.TIME_WINDOWS[Math.floor(Math.random() * CONFIG.TIME_WINDOWS.length)]
  return { start: window.start, end: window.end }
}

function calculatePortions(studentCount: number): number {
  const factor = CONFIG.MIN_PORTION_FACTOR +
    Math.random() * (CONFIG.MAX_PORTION_FACTOR - CONFIG.MIN_PORTION_FACTOR)
  return Math.max(50, Math.floor(studentCount * factor)) // Minimum 50 portions
}

function generateQRCode(schoolId: number, counter: number): string {
  const hash = crypto.randomBytes(4).toString('hex')
  return `MBG-${schoolId}-${counter}-${hash}`
}

function generateDriverName(): string {
  const firstNames = [
    'Agus', 'Budi', 'Chandra', 'Dedi', 'Eko', 'Fajar', 'Gilang', 'Hadi',
    'Indra', 'Joko', 'Kukuh', 'Lukman', 'Made', 'Nanda', 'Oka', 'Putra',
    'Rizki', 'Sandi', 'Tono', 'Umar', 'Vino', 'Wahyu', 'Yanto', 'Zainal',
    'Rina', 'Siti', 'Tuti', 'Umi', 'Vina', 'Wati', 'Yuni', 'Zulfa'
  ]

  const lastNames = [
    'Setiawan', 'Wijaya', 'Pratama', 'Santoso', 'Rahmad', 'Kusuma',
    'Permana', 'Hidayat', 'Nugroho', 'Saputra', 'Wibowo', 'Gunawan',
    'Hakim', 'Rahman', 'Irawan', 'Firmansyah', 'Suryanto', 'Kurniawan'
  ]

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]

  return `${firstName} ${lastName}`
}

function generateDriverPhone(): string {
  const prefixes = ['0812', '0813', '0821', '0822', '0851', '0852']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const middle = Math.floor(1000 + Math.random() * 9000)
  const last = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${middle}-${last}`
}

function generateVehicleNumber(): string {
  const areas = ['B', 'D', 'F', 'L', 'N', 'T', 'AA', 'AB', 'AD', 'AE']
  const area = areas[Math.floor(Math.random() * areas.length)]
  const number = Math.floor(1000 + Math.random() * 9000)
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const code = letters[Math.floor(Math.random() * letters.length)] +
    letters[Math.floor(Math.random() * letters.length)] +
    letters[Math.floor(Math.random() * letters.length)]

  return `${area} ${number} ${code}`
}

function generateNotes(): string | null {
  const noteOptions = [
    'Mohon diantar tepat waktu',
    'Parkir di halaman belakang',
    'Hubungi petugas keamanan',
    'Antar ke kantin sekolah',
    'Koordinasi dengan kepala sekolah',
    null, null, null // 50% chance of no notes
  ]

  return noteOptions[Math.floor(Math.random() * noteOptions.length)]
}

function calculateDeliveredAt(deliveryDate: Date, timeStart: string, status: string): string | null {
  if (!['delivered', 'verified'].includes(status)) {
    return null
  }

  const [hours, minutes] = timeStart.split(':').map(Number)
  const deliveredAt = new Date(deliveryDate)
  deliveredAt.setHours(hours, minutes, 0, 0)

  // Add random 0-120 minutes
  const randomMinutes = Math.floor(Math.random() * 121)
  deliveredAt.setMinutes(deliveredAt.getMinutes() + randomMinutes)

  return deliveredAt.toISOString()
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchSchools(supabase: any): Promise<School[]> {
  logger.log('Fetching schools...')

  const query = supabase
    .from('schools')
    .select('id, name, npsn')
    .order('id')

  if (CONFIG.TEST_MODE) {
    query.limit(CONFIG.TEST_SCHOOLS)
  }

  const { data, error } = await query

  if (error || !data) {
    throw new Error(`Failed to fetch schools: ${error?.message}`)
  }

  logger.success(`Found ${data.length} schools`)

  if (CONFIG.TEST_MODE) {
    logger.log(`⚠️  TEST MODE - Using only ${data.length} schools`)
  }

  return data
}

async function fetchCaterings(supabase: any): Promise<Catering[]> {
  logger.log('Fetching caterings...')

  const { data, error } = await supabase
    .from('caterings')
    .select('id, name')
    .order('id')

  if (error || !data) {
    throw new Error(`Failed to fetch caterings: ${error?.message}`)
  }

  logger.success(`Found ${data.length} caterings`)
  return data
}

async function fetchMenuItems(supabase: any): Promise<Map<number, MenuItem[]>> {
  logger.log('Fetching menu items...')

  const { data, error } = await supabase
    .from('menu_items')
    .select('id, catering_id, name, price, category')
    .eq('is_available', true)
    .order('id')

  if (error || !data) {
    throw new Error(`Failed to fetch menu items: ${error?.message}`)
  }

  // Group by catering_id
  const menuMap = new Map<number, MenuItem[]>()

  data.forEach((item: MenuItem) => {
    if (!menuMap.has(item.catering_id)) {
      menuMap.set(item.catering_id, [])
    }
    menuMap.get(item.catering_id)!.push(item)
  })

  logger.success(`Found ${data.length} menu items across ${menuMap.size} caterings`)
  return menuMap
}

// ============================================================================
// DELIVERY GENERATION
// ============================================================================

function selectMenuItemsForDelivery(
  cateringMenus: MenuItem[],
  portions: number
): MenuItemOrder[] {
  const menuCount = CONFIG.MIN_MENU_ITEMS +
    Math.floor(Math.random() * (CONFIG.MAX_MENU_ITEMS - CONFIG.MIN_MENU_ITEMS + 1))

  // Ensure at least 1 complete_meal or main_course
  const mainCourses = cateringMenus.filter(m =>
    m.category === 'complete_meal' || m.category === 'main_course'
  )

  const otherItems = cateringMenus.filter(m =>
    m.category !== 'complete_meal' && m.category !== 'main_course'
  )

  const selectedMenus: MenuItem[] = []

  // Add 1 main course
  if (mainCourses.length > 0) {
    selectedMenus.push(mainCourses[Math.floor(Math.random() * mainCourses.length)])
  }

  // Add remaining items
  const remaining = menuCount - selectedMenus.length
  for (let i = 0; i < remaining && otherItems.length > 0; i++) {
    const item = otherItems[Math.floor(Math.random() * otherItems.length)]
    if (!selectedMenus.includes(item)) {
      selectedMenus.push(item)
    }
  }

  // Convert to MenuItemOrder
  return selectedMenus.map(menu => ({
    menu_id: menu.id,
    menu_name: menu.name,
    quantity: portions,
    unit_price: menu.price,
    subtotal: portions * menu.price
  }))
}

async function generateDeliveries(
  schools: School[],
  caterings: Catering[],
  menuMap: Map<number, MenuItem[]>
): Promise<DeliveryInsert[]> {
  logger.log('Generating deliveries...')

  const deliveries: DeliveryInsert[] = []
  let deliveryCounter = 0

  for (let i = 0; i < schools.length; i++) {
    const school = schools[i]

    // Determine number of deliveries for this school
    const numDeliveries = CONFIG.TEST_MODE
      ? CONFIG.TEST_DELIVERIES_PER_SCHOOL
      : CONFIG.MIN_DELIVERIES_PER_SCHOOL +
      Math.floor(Math.random() * (CONFIG.MAX_DELIVERIES_PER_SCHOOL - CONFIG.MIN_DELIVERIES_PER_SCHOOL + 1))

    for (let j = 0; j < numDeliveries; j++) {
      // Random catering
      const catering = caterings[Math.floor(Math.random() * caterings.length)]

      // Get menus for this catering
      const cateringMenus = menuMap.get(catering.id)
      if (!cateringMenus || cateringMenus.length === 0) {
        continue // Skip if no menus available
      }

      // Generate delivery data
      const deliveryDate = generateDeliveryDate()
      const timeWindow = getRandomTimeWindow()
      const portions = calculatePortions(300 + Math.floor(Math.random() * 500)) // 300-800 students
      const menuItems = selectMenuItemsForDelivery(cateringMenus, portions)
      const totalAmount = menuItems.reduce((sum, item) => sum + item.subtotal, 0)
      const status = getRandomStatus()
      const qrCode = generateQRCode(school.id, ++deliveryCounter)

      // Driver info for delivered/verified status
      let driverName: string | null = null
      let driverPhone: string | null = null
      let vehicleNumber: string | null = null

      if (['delivered', 'verified'].includes(status)) {
        driverName = generateDriverName()
        driverPhone = generateDriverPhone()
        vehicleNumber = generateVehicleNumber()
      }

      deliveries.push({
        school_id: school.id,
        catering_id: catering.id,
        delivery_date: deliveryDate.toISOString().split('T')[0],
        delivery_time_start: timeWindow.start,
        delivery_time_end: timeWindow.end,
        portions,
        menu_items: menuItems,
        amount: totalAmount, // For backward compatibility with old schema
        total_amount: totalAmount,
        status,
        notes: generateNotes(),
        qr_code: qrCode,
        driver_name: driverName,
        driver_phone: driverPhone,
        vehicle_number: vehicleNumber,
        delivered_at: calculateDeliveredAt(deliveryDate, timeWindow.start, status)
      })
    }

    if ((i + 1) % 100 === 0) {
      logger.progress(i + 1, schools.length, 'Generating deliveries')
    }
  }

  logger.success(`Generated ${deliveries.length} deliveries`)
  return deliveries
}

// ============================================================================
// SUPABASE OPERATIONS
// ============================================================================

async function insertDeliveriesInBatches(
  supabase: any,
  deliveries: DeliveryInsert[],
  batchSize: number
): Promise<{ success: number; failed: number; errors: any[] }> {
  let success = 0
  let failed = 0
  const errors: any[] = []

  const totalBatches = Math.ceil(deliveries.length / batchSize)
  logger.log(`Inserting ${deliveries.length} deliveries in ${totalBatches} batches...`)

  for (let i = 0; i < deliveries.length; i += batchSize) {
    const batch = deliveries.slice(i, i + batchSize)
    const batchNumber = Math.floor(i / batchSize) + 1

    try {
      const { data, error } = await supabase
        .from('deliveries')
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
          Math.min(i + batchSize, deliveries.length),
          deliveries.length,
          'Inserting deliveries'
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

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return { success, failed, errors }
}

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function seedDeliveries() {
  logger.log('='.repeat(80))
  logger.log('SEEDING SCRIPT 04: DELIVERIES')
  if (CONFIG.TEST_MODE) {
    logger.log('⚠️  TEST MODE ENABLED - Limited data seeding')
  }
  logger.log('='.repeat(80))

  const stats: SeedingStats = {
    totalDeliveries: 0,
    successDeliveries: 0,
    failedDeliveries: 0,
    deliveriesByStatus: {},
    deliveriesByMonth: {},
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
    // Fetch data
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 1: FETCHING DEPENDENCIES')
    logger.log('='.repeat(80))

    const schools = await fetchSchools(supabase)
    const caterings = await fetchCaterings(supabase)
    const menuMap = await fetchMenuItems(supabase)

    // Generate deliveries
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 2: GENERATING DELIVERIES')
    logger.log('='.repeat(80))

    const deliveries = await generateDeliveries(schools, caterings, menuMap)
    stats.totalDeliveries = deliveries.length

    // Count by status
    deliveries.forEach((delivery: DeliveryInsert) => {
      stats.deliveriesByStatus[delivery.status] =
        (stats.deliveriesByStatus[delivery.status] || 0) + 1

      const month = delivery.delivery_date.substring(0, 7) // YYYY-MM
      stats.deliveriesByMonth[month] = (stats.deliveriesByMonth[month] || 0) + 1
    })

    // Insert deliveries
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 3: INSERTING DELIVERIES TO DATABASE')
    logger.log('='.repeat(80))

    const result = await insertDeliveriesInBatches(supabase, deliveries, CONFIG.BATCH_SIZE)
    stats.successDeliveries = result.success
    stats.failedDeliveries = result.failed
    stats.errors = result.errors

    // Print summary
    logger.log('\n' + '='.repeat(80))
    logger.log('SEEDING SUMMARY')
    logger.log('='.repeat(80))

    console.log(`
📊 DELIVERIES:
   Total: ${stats.totalDeliveries}
   ✅ Success: ${stats.successDeliveries}
   ❌ Failed: ${stats.failedDeliveries}
   Success Rate: ${((stats.successDeliveries / stats.totalDeliveries) * 100).toFixed(1)}%

📊 BY STATUS:`)

    Object.entries(stats.deliveriesByStatus)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        const percentage = ((count / stats.totalDeliveries) * 100).toFixed(1)
        console.log(`   ${status.padEnd(15)}: ${count.toString().padStart(6)} (${percentage}%)`)
      })

    console.log('\n📊 BY MONTH (Top 10):')
    Object.entries(stats.deliveriesByMonth)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([month, count]) => {
        console.log(`   ${month}: ${count.toString().padStart(6)} deliveries`)
      })

    if (stats.errors.length > 0) {
      logger.log('\n❌ ERRORS ENCOUNTERED:')
      stats.errors.slice(0, 10).forEach((err: any, index: number) => {
        console.log(`${index + 1}. Batch ${err.batch}: ${err.error}`)
      })
      if (stats.errors.length > 10) {
        logger.log(`... and ${stats.errors.length - 10} more errors`)
      }
    }

    logger.log('\n' + '='.repeat(80))
    logger.success('SEEDING COMPLETED!')
    logger.log('='.repeat(80))

    // Save stats
    const statsPath = path.join(__dirname, '../seeding-logs/04-deliveries-stats.json')
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
  seedDeliveries()
    .then(() => {
      logger.success('Script execution completed')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('Script execution failed', error)
      process.exit(1)
    })
}

export { seedDeliveries }
