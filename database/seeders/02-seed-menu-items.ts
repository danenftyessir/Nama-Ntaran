/**
 * ============================================================================
 * SEEDING SCRIPT 02: MENU ITEMS
 * ============================================================================
 *
 * Purpose: Seed menu_items table with nutritious food catalog
 * Dependencies: 01-seed-users.ts (caterings must exist)
 *
 * Run: npx ts-node database/seeders/02-seed-menu-items.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

dotenv.config()

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface MenuItemInsert {
  catering_id: number
  name: string
  description: string
  category: string
  price: number
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  fiber: number
  vitamins: string[]
  minerals: string[]
  allergens: string[]
  image_url: string | null
  is_available: boolean
  is_halal: boolean
  preparation_time: number
  serving_size: string
}

interface MenuTemplate {
  name: string
  description: string
  category: string
  price: number
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  fiber: number
  vitamins: string[]
  minerals: string[]
  allergens: string[]
  preparation_time: number
  serving_size: string
}

interface SeedingStats {
  totalMenus: number
  successMenus: number
  failedMenus: number
  menusByCategory: Record<string, number>
  errors: Array<{ type: string; batch?: number; error?: string; count?: number }>
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Test Mode
  TEST_MODE: false, // Set to true for testing with limited data
  TEST_CATERINGS: 3, // Number of caterings to seed in test mode

  // Seeding Options
  BATCH_SIZE: 100,
  MIN_MENUS_PER_CATERING: 15,
  MAX_MENUS_PER_CATERING: 25,

  // Availability (90% available, 10% not available)
  AVAILABILITY_RATE: 0.9,
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
// MENU TEMPLATES (Base recipes with variations)
// ============================================================================

const MENU_TEMPLATES: MenuTemplate[] = [
  // COMPLETE MEALS (40%)
  {
    name: 'Nasi Kotak Komplit',
    description: 'Nasi putih, ayam goreng bumbu kuning, tempe goreng, sayur lodeh, sambal, dan buah pisang',
    category: 'complete_meal',
    price: 25000,
    calories: 550,
    protein: 30,
    carbohydrates: 65,
    fat: 18,
    fiber: 8,
    vitamins: ['A', 'C', 'B1', 'B12'],
    minerals: ['Zat Besi', 'Kalsium', 'Zinc'],
    allergens: ['Kedelai'],
    preparation_time: 45,
    serving_size: '1 porsi kotak'
  },
  {
    name: 'Nasi Goreng Ayam Spesial',
    description: 'Nasi goreng dengan potongan ayam, telur, sayuran segar, acar, dan kerupuk',
    category: 'main_course',
    price: 22000,
    calories: 520,
    protein: 28,
    carbohydrates: 68,
    fat: 16,
    fiber: 6,
    vitamins: ['A', 'B6', 'C', 'D'],
    minerals: ['Zat Besi', 'Fosfor'],
    allergens: ['Telur', 'Gluten'],
    preparation_time: 30,
    serving_size: '1 piring'
  },
  {
    name: 'Nasi Kuning Tumpeng Mini',
    description: 'Nasi kuning gurih dengan ayam suwir, telur pindang, tempe orek, kering kentang, dan sambal goreng ati',
    category: 'complete_meal',
    price: 28000,
    calories: 580,
    protein: 32,
    carbohydrates: 70,
    fat: 20,
    fiber: 7,
    vitamins: ['A', 'B1', 'B12', 'E'],
    minerals: ['Kalsium', 'Zat Besi', 'Magnesium'],
    allergens: ['Kedelai', 'Telur'],
    preparation_time: 60,
    serving_size: '1 porsi'
  },
  {
    name: 'Nasi Uduk Komplit',
    description: 'Nasi uduk dengan ayam goreng, telur balado, tempe orek, kering kentang, dan sambal',
    category: 'complete_meal',
    price: 26000,
    calories: 540,
    protein: 29,
    carbohydrates: 66,
    fat: 19,
    fiber: 6,
    vitamins: ['A', 'C', 'B12'],
    minerals: ['Zat Besi', 'Zinc'],
    allergens: ['Kedelai', 'Telur'],
    preparation_time: 50,
    serving_size: '1 porsi'
  },
  {
    name: 'Nasi Liwet Komplit',
    description: 'Nasi liwet gurih dengan ayam suwir, tempe bacem, telur pindang, sambal terasi, dan lalapan',
    category: 'complete_meal',
    price: 24000,
    calories: 530,
    protein: 28,
    carbohydrates: 64,
    fat: 17,
    fiber: 7,
    vitamins: ['A', 'C', 'B6'],
    minerals: ['Zat Besi', 'Kalium'],
    allergens: ['Kedelai', 'Telur'],
    preparation_time: 55,
    serving_size: '1 porsi'
  },
  {
    name: 'Nasi Pecel Komplit',
    description: 'Nasi dengan sayuran rebus, tempe goreng, rempeyek, dan sambal pecel kacang',
    category: 'complete_meal',
    price: 20000,
    calories: 480,
    protein: 22,
    carbohydrates: 62,
    fat: 15,
    fiber: 9,
    vitamins: ['A', 'C', 'E', 'K'],
    minerals: ['Kalsium', 'Zat Besi'],
    allergens: ['Kedelai', 'Kacang'],
    preparation_time: 40,
    serving_size: '1 porsi'
  },
  {
    name: 'Nasi Rawon Komplit',
    description: 'Nasi dengan rawon daging sapi, telur asin, tempe goreng, dan sambal',
    category: 'complete_meal',
    price: 30000,
    calories: 600,
    protein: 35,
    carbohydrates: 68,
    fat: 22,
    fiber: 6,
    vitamins: ['A', 'B12', 'K'],
    minerals: ['Zat Besi', 'Zinc', 'Fosfor'],
    allergens: ['Kedelai', 'Telur'],
    preparation_time: 90,
    serving_size: '1 porsi'
  },

  // SOUPS (15%)
  {
    name: 'Sop Iga Sapi Bening',
    description: 'Sop iga sapi dengan kentang, wortel, tomat, dan daun bawang',
    category: 'soup',
    price: 35000,
    calories: 450,
    protein: 35,
    carbohydrates: 28,
    fat: 22,
    fiber: 5,
    vitamins: ['A', 'C', 'B12', 'K'],
    minerals: ['Zat Besi', 'Zinc', 'Fosfor'],
    allergens: [],
    preparation_time: 90,
    serving_size: '1 mangkok'
  },
  {
    name: 'Soto Ayam Kuning',
    description: 'Soto ayam dengan kuah kuning gurih, suwiran ayam, lontong, telur rebus, dan emping',
    category: 'soup',
    price: 20000,
    calories: 380,
    protein: 24,
    carbohydrates: 42,
    fat: 14,
    fiber: 4,
    vitamins: ['A', 'C', 'B6'],
    minerals: ['Kalsium', 'Zat Besi'],
    allergens: ['Telur'],
    preparation_time: 60,
    serving_size: '1 mangkok'
  },
  {
    name: 'Sup Sayuran Sehat',
    description: 'Sup dengan sayuran segar: wortel, brokoli, kembang kol, jagung manis, dan ayam',
    category: 'soup',
    price: 18000,
    calories: 280,
    protein: 18,
    carbohydrates: 32,
    fat: 10,
    fiber: 8,
    vitamins: ['A', 'C', 'K', 'B6'],
    minerals: ['Kalsium', 'Kalium'],
    allergens: [],
    preparation_time: 40,
    serving_size: '1 mangkok'
  },
  {
    name: 'Soto Betawi',
    description: 'Soto Betawi dengan daging sapi, jeroan, kuah santan, dan emping melinjo',
    category: 'soup',
    price: 28000,
    calories: 480,
    protein: 30,
    carbohydrates: 38,
    fat: 24,
    fiber: 4,
    vitamins: ['A', 'B12', 'C'],
    minerals: ['Zat Besi', 'Zinc'],
    allergens: [],
    preparation_time: 75,
    serving_size: '1 mangkok'
  },

  // SIDE DISHES (20%)
  {
    name: 'Ayam Goreng Bumbu Kuning',
    description: 'Ayam goreng dengan bumbu kuning khas, renyah di luar lembut di dalam',
    category: 'side_dish',
    price: 15000,
    calories: 280,
    protein: 26,
    carbohydrates: 8,
    fat: 18,
    fiber: 1,
    vitamins: ['B6', 'B12'],
    minerals: ['Zat Besi', 'Zinc'],
    allergens: [],
    preparation_time: 45,
    serving_size: '1 potong'
  },
  {
    name: 'Tempe Goreng Bumbu Kering',
    description: 'Tempe goreng dengan taburan bumbu kering pedas manis',
    category: 'side_dish',
    price: 8000,
    calories: 180,
    protein: 12,
    carbohydrates: 15,
    fat: 10,
    fiber: 4,
    vitamins: ['B2', 'B6'],
    minerals: ['Kalsium', 'Magnesium'],
    allergens: ['Kedelai'],
    preparation_time: 20,
    serving_size: '3 potong'
  },
  {
    name: 'Perkedel Kentang',
    description: 'Perkedel kentang gurih dengan daging cincang',
    category: 'side_dish',
    price: 10000,
    calories: 220,
    protein: 8,
    carbohydrates: 28,
    fat: 10,
    fiber: 3,
    vitamins: ['C', 'B6'],
    minerals: ['Kalium', 'Fosfor'],
    allergens: ['Telur', 'Gluten'],
    preparation_time: 35,
    serving_size: '3 buah'
  },
  {
    name: 'Rendang Daging Sapi',
    description: 'Rendang daging sapi empuk dengan bumbu rempah khas Padang',
    category: 'side_dish',
    price: 25000,
    calories: 350,
    protein: 32,
    carbohydrates: 12,
    fat: 22,
    fiber: 2,
    vitamins: ['B12', 'A'],
    minerals: ['Zat Besi', 'Zinc'],
    allergens: [],
    preparation_time: 120,
    serving_size: '1 porsi'
  },
  {
    name: 'Ikan Goreng Bumbu Kuning',
    description: 'Ikan goreng dengan bumbu kuning rempah, renyah dan harum',
    category: 'side_dish',
    price: 18000,
    calories: 260,
    protein: 28,
    carbohydrates: 6,
    fat: 14,
    fiber: 1,
    vitamins: ['D', 'B12'],
    minerals: ['Fosfor', 'Selenium'],
    allergens: ['Ikan'],
    preparation_time: 35,
    serving_size: '1 ekor'
  },
  {
    name: 'Tahu Goreng Crispy',
    description: 'Tahu goreng renyah dengan isian sayuran',
    category: 'side_dish',
    price: 7000,
    calories: 150,
    protein: 10,
    carbohydrates: 12,
    fat: 8,
    fiber: 3,
    vitamins: ['B1', 'B2'],
    minerals: ['Kalsium', 'Magnesium'],
    allergens: ['Kedelai'],
    preparation_time: 25,
    serving_size: '4 potong'
  },

  // SALADS & VEGETABLES (10%)
  {
    name: 'Gado-Gado Betawi',
    description: 'Sayuran rebus dengan saus kacang kental, lontong, telur rebus, dan kerupuk',
    category: 'salad',
    price: 17000,
    calories: 320,
    protein: 15,
    carbohydrates: 38,
    fat: 14,
    fiber: 10,
    vitamins: ['A', 'C', 'E', 'K'],
    minerals: ['Kalsium', 'Zat Besi'],
    allergens: ['Kacang', 'Telur'],
    preparation_time: 30,
    serving_size: '1 porsi'
  },
  {
    name: 'Sayur Asem Segar',
    description: 'Sayur asem dengan kacang panjang, jagung manis, labu siam, dan kacang tanah',
    category: 'side_dish',
    price: 12000,
    calories: 150,
    protein: 6,
    carbohydrates: 22,
    fat: 5,
    fiber: 8,
    vitamins: ['A', 'C', 'B1'],
    minerals: ['Kalium', 'Magnesium'],
    allergens: ['Kacang'],
    preparation_time: 40,
    serving_size: '1 mangkok'
  },
  {
    name: 'Pecel Sayur',
    description: 'Sayuran rebus dengan sambal pecel kacang pedas manis',
    category: 'salad',
    price: 15000,
    calories: 280,
    protein: 12,
    carbohydrates: 32,
    fat: 12,
    fiber: 9,
    vitamins: ['A', 'C', 'E'],
    minerals: ['Kalsium', 'Zat Besi'],
    allergens: ['Kacang'],
    preparation_time: 25,
    serving_size: '1 porsi'
  },
  {
    name: 'Urap Sayuran',
    description: 'Sayuran rebus dengan kelapa parut bumbu, tauge, kacang panjang, dan bayam',
    category: 'salad',
    price: 12000,
    calories: 200,
    protein: 8,
    carbohydrates: 24,
    fat: 10,
    fiber: 8,
    vitamins: ['A', 'C', 'K'],
    minerals: ['Kalsium', 'Zat Besi'],
    allergens: [],
    preparation_time: 30,
    serving_size: '1 porsi'
  },

  // DESSERTS (10%)
  {
    name: 'Buah Potong Segar',
    description: 'Campuran buah segar: semangka, melon, pepaya, nanas, dan anggur',
    category: 'dessert',
    price: 10000,
    calories: 80,
    protein: 1,
    carbohydrates: 20,
    fat: 0,
    fiber: 3,
    vitamins: ['A', 'C', 'B6'],
    minerals: ['Kalium'],
    allergens: [],
    preparation_time: 15,
    serving_size: '1 cup'
  },
  {
    name: 'Pisang Goreng Kipas',
    description: 'Pisang goreng renyah dengan taburan gula halus',
    category: 'dessert',
    price: 8000,
    calories: 180,
    protein: 2,
    carbohydrates: 32,
    fat: 6,
    fiber: 2,
    vitamins: ['B6', 'C'],
    minerals: ['Kalium', 'Magnesium'],
    allergens: ['Gluten'],
    preparation_time: 20,
    serving_size: '3 buah'
  },
  {
    name: 'Es Buah Segar',
    description: 'Es buah dengan campuran buah tropis, sirup, susu, dan es serut',
    category: 'dessert',
    price: 12000,
    calories: 150,
    protein: 3,
    carbohydrates: 32,
    fat: 2,
    fiber: 4,
    vitamins: ['A', 'C'],
    minerals: ['Kalium', 'Kalsium'],
    allergens: ['Susu'],
    preparation_time: 15,
    serving_size: '1 mangkok'
  },
  {
    name: 'Kolak Pisang',
    description: 'Kolak pisang dengan kuah santan manis, ubi, dan kolang-kaling',
    category: 'dessert',
    price: 10000,
    calories: 200,
    protein: 2,
    carbohydrates: 38,
    fat: 6,
    fiber: 3,
    vitamins: ['B6', 'C'],
    minerals: ['Kalium'],
    allergens: [],
    preparation_time: 30,
    serving_size: '1 mangkok'
  },

  // BEVERAGES (5%)
  {
    name: 'Jus Jeruk Segar',
    description: 'Jus jeruk asli tanpa gula tambahan',
    category: 'beverage',
    price: 8000,
    calories: 110,
    protein: 2,
    carbohydrates: 26,
    fat: 0,
    fiber: 1,
    vitamins: ['C', 'A'],
    minerals: ['Kalium'],
    allergens: [],
    preparation_time: 5,
    serving_size: '1 gelas (250ml)'
  },
  {
    name: 'Teh Manis Hangat',
    description: 'Teh manis hangat',
    category: 'beverage',
    price: 5000,
    calories: 70,
    protein: 0,
    carbohydrates: 18,
    fat: 0,
    fiber: 0,
    vitamins: [],
    minerals: [],
    allergens: [],
    preparation_time: 5,
    serving_size: '1 gelas (200ml)'
  },
  {
    name: 'Jus Alpukat',
    description: 'Jus alpukat segar dengan susu cokelat',
    category: 'beverage',
    price: 12000,
    calories: 250,
    protein: 5,
    carbohydrates: 32,
    fat: 12,
    fiber: 7,
    vitamins: ['C', 'E', 'K', 'B6'],
    minerals: ['Kalium', 'Magnesium'],
    allergens: ['Susu'],
    preparation_time: 8,
    serving_size: '1 gelas (300ml)'
  },
  {
    name: 'Es Teh Manis',
    description: 'Es teh manis segar',
    category: 'beverage',
    price: 5000,
    calories: 70,
    protein: 0,
    carbohydrates: 18,
    fat: 0,
    fiber: 0,
    vitamins: [],
    minerals: [],
    allergens: [],
    preparation_time: 5,
    serving_size: '1 gelas (250ml)'
  },

  // SNACKS (5%)
  {
    name: 'Lemper Ayam',
    description: 'Lemper dengan isian ayam suwir berbumbu, dibungkus daun pisang',
    category: 'snack',
    price: 8000,
    calories: 180,
    protein: 10,
    carbohydrates: 28,
    fat: 4,
    fiber: 2,
    vitamins: ['B6', 'B12'],
    minerals: ['Zat Besi'],
    allergens: [],
    preparation_time: 45,
    serving_size: '2 buah'
  },
  {
    name: 'Risoles Mayo',
    description: 'Risoles isi sayuran dan mayones, digoreng renyah',
    category: 'snack',
    price: 10000,
    calories: 220,
    protein: 8,
    carbohydrates: 24,
    fat: 11,
    fiber: 3,
    vitamins: ['A', 'C'],
    minerals: ['Kalsium'],
    allergens: ['Telur', 'Gluten', 'Susu'],
    preparation_time: 40,
    serving_size: '3 buah'
  },
  {
    name: 'Kroket Kentang',
    description: 'Kroket kentang isi daging cincang, digoreng crispy',
    category: 'snack',
    price: 9000,
    calories: 200,
    protein: 9,
    carbohydrates: 26,
    fat: 8,
    fiber: 3,
    vitamins: ['C', 'B6'],
    minerals: ['Kalium', 'Fosfor'],
    allergens: ['Telur', 'Gluten'],
    preparation_time: 35,
    serving_size: '3 buah'
  },
]

// ============================================================================
// MENU GENERATION WITH VARIATIONS
// ============================================================================

function generateMenuVariations(): MenuTemplate[] {
  const variations: MenuTemplate[] = [...MENU_TEMPLATES]

  // Price variations for same menu
  const priceVariations = [-2000, -1000, 0, 1000, 2000, 3000]

  // Create variations by tweaking prices and minor details
  MENU_TEMPLATES.forEach(template => {
    // Create 2-3 variations per template
    for (let i = 0; i < 2; i++) {
      const priceAdjust = priceVariations[Math.floor(Math.random() * priceVariations.length)]
      const variant: MenuTemplate = {
        ...template,
        name: template.name + (i > 0 ? ` Premium` : ` Ekonomis`),
        price: Math.max(5000, template.price + priceAdjust),
        // Slight nutrition adjustments
        calories: template.calories + Math.floor(Math.random() * 40 - 20),
        protein: template.protein + Math.floor(Math.random() * 4 - 2),
      }
      variations.push(variant)
    }
  })

  return variations
}

function selectRandomMenus(allMenus: MenuTemplate[], count: number): MenuTemplate[] {
  // Ensure category distribution
  const distribution = {
    complete_meal: 0.40,
    main_course: 0.15,
    soup: 0.15,
    side_dish: 0.15,
    salad: 0.05,
    dessert: 0.05,
    beverage: 0.03,
    snack: 0.02
  }

  const selected: MenuTemplate[] = []
  const shuffled = [...allMenus].sort(() => Math.random() - 0.5)

  // First, add based on distribution
  Object.entries(distribution).forEach(([category, percentage]) => {
    const targetCount = Math.floor(count * percentage)
    const categoryMenus = shuffled.filter(m => m.category === category)

    for (let i = 0; i < targetCount && categoryMenus.length > 0; i++) {
      const menu = categoryMenus.pop()
      if (menu) selected.push(menu)
    }
  })

  // Fill remaining with random menus
  while (selected.length < count && shuffled.length > 0) {
    const menu = shuffled.pop()
    if (menu && !selected.includes(menu)) {
      selected.push(menu)
    }
  }

  return selected
}

// ============================================================================
// DATA GENERATION
// ============================================================================

async function generateMenuItems(supabase: any): Promise<MenuItemInsert[]> {
  logger.log('Fetching caterings from database...')

  const { data: caterings, error } = await supabase
    .from('caterings')
    .select('id')
    .order('id')

  if (error || !caterings) {
    throw new Error(`Failed to fetch caterings: ${error?.message}`)
  }

  const cateringsToUse = CONFIG.TEST_MODE
    ? caterings.slice(0, CONFIG.TEST_CATERINGS)
    : caterings

  logger.success(`Found ${cateringsToUse.length} caterings`)

  if (CONFIG.TEST_MODE) {
    logger.log(`⚠️  TEST MODE - Using only ${cateringsToUse.length} caterings`)
  }

  logger.log('Generating menu variations...')
  const allMenuVariations = generateMenuVariations()
  logger.success(`Generated ${allMenuVariations.length} menu variations`)

  logger.log('Assigning menus to caterings...')
  const menuItems: MenuItemInsert[] = []

  cateringsToUse.forEach((catering: { id: number }, index: number) => {
    const menuCount = Math.floor(
      Math.random() * (CONFIG.MAX_MENUS_PER_CATERING - CONFIG.MIN_MENUS_PER_CATERING + 1)
    ) + CONFIG.MIN_MENUS_PER_CATERING

    const selectedMenus = selectRandomMenus(allMenuVariations, menuCount)

    selectedMenus.forEach((template: MenuTemplate) => {
      const isAvailable = Math.random() < CONFIG.AVAILABILITY_RATE

      menuItems.push({
        catering_id: catering.id,
        name: template.name,
        description: template.description,
        category: template.category,
        price: template.price,
        calories: template.calories,
        protein: template.protein,
        carbohydrates: template.carbohydrates,
        fat: template.fat,
        fiber: template.fiber,
        vitamins: template.vitamins,
        minerals: template.minerals,
        allergens: template.allergens,
        image_url: null,
        is_available: isAvailable,
        is_halal: true,
        preparation_time: template.preparation_time,
        serving_size: template.serving_size
      })
    })

    if ((index + 1) % 10 === 0) {
      logger.progress(index + 1, cateringsToUse.length, 'Generating menus')
    }
  })

  logger.success(`Generated ${menuItems.length} menu items for ${cateringsToUse.length} caterings`)
  return menuItems
}

// ============================================================================
// SUPABASE OPERATIONS
// ============================================================================

async function insertMenuItemsInBatches(
  supabase: any,
  menuItems: MenuItemInsert[],
  batchSize: number
): Promise<{ success: number; failed: number; errors: any[] }> {
  let success = 0
  let failed = 0
  const errors: any[] = []

  const totalBatches = Math.ceil(menuItems.length / batchSize)
  logger.log(`Inserting ${menuItems.length} menu items in ${totalBatches} batches...`)

  for (let i = 0; i < menuItems.length; i += batchSize) {
    const batch = menuItems.slice(i, i + batchSize)
    const batchNumber = Math.floor(i / batchSize) + 1

    try {
      const { data, error } = await supabase
        .from('menu_items')
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
          Math.min(i + batchSize, menuItems.length),
          menuItems.length,
          'Inserting menu items'
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

async function seedMenuItems() {
  logger.log('='.repeat(80))
  logger.log('SEEDING SCRIPT 02: MENU ITEMS')
  if (CONFIG.TEST_MODE) {
    logger.log('⚠️  TEST MODE ENABLED - Limited data seeding')
  }
  logger.log('='.repeat(80))

  const stats: SeedingStats = {
    totalMenus: 0,
    successMenus: 0,
    failedMenus: 0,
    menusByCategory: {},
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
    // Generate menu items
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 1: GENERATING MENU ITEMS')
    logger.log('='.repeat(80))

    const menuItems = await generateMenuItems(supabase)
    stats.totalMenus = menuItems.length

    // Count by category
    menuItems.forEach(item => {
      stats.menusByCategory[item.category] = (stats.menusByCategory[item.category] || 0) + 1
    })

    // Insert menu items
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 2: INSERTING MENU ITEMS TO DATABASE')
    logger.log('='.repeat(80))

    const result = await insertMenuItemsInBatches(supabase, menuItems, CONFIG.BATCH_SIZE)
    stats.successMenus = result.success
    stats.failedMenus = result.failed
    stats.errors = result.errors

    // Print summary
    logger.log('\n' + '='.repeat(80))
    logger.log('SEEDING SUMMARY')
    logger.log('='.repeat(80))

    console.log(`
📊 MENU ITEMS:
   Total: ${stats.totalMenus}
   ✅ Success: ${stats.successMenus}
   ❌ Failed: ${stats.failedMenus}
   Success Rate: ${((stats.successMenus / stats.totalMenus) * 100).toFixed(1)}%

📊 BY CATEGORY:`)

    Object.entries(stats.menusByCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        const percentage = ((count / stats.totalMenus) * 100).toFixed(1)
        console.log(`   ${category.padEnd(15)}: ${count.toString().padStart(4)} (${percentage}%)`)
      })

    if (stats.errors.length > 0) {
      logger.log('\n❌ ERRORS ENCOUNTERED:')
      stats.errors.slice(0, 10).forEach((err, index) => {
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
    const statsPath = path.join(__dirname, '../seeding-logs/02-menu-items-stats.json')
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
  seedMenuItems()
    .then(() => {
      logger.success('Script execution completed')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('Script execution failed', error)
      process.exit(1)
    })
}

export { seedMenuItems }
