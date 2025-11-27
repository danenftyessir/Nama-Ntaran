/**
 * ============================================================================
 * SEEDING SCRIPT 43: CATERING COMPLETE DATA
 * ============================================================================
 *
 * Purpose: Seed data lengkap untuk catering vendors
 * Dependencies:
 *   - @supabase/supabase-js
 *   - dotenv
 *   - Requires: caterings (from 01-seed-users.ts)
 *
 * Run: npx ts-node database/seeders/43-seed-catering-complete-data.ts
 *
 * Data yang dibuat:
 * - Payment methods untuk catering (bank transfer, wallet, crypto)
 * - Menu items untuk setiap catering
 * - Vendor risk assessments
 * - Catering contracts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Catering {
  id: number
  name: string
  company_name: string
  wallet_address: string
  email: string
}

interface PaymentMethodInsert {
  catering_id: number
  method_type: string
  bank_code: string | null
  account_number: string | null
  account_holder_name: string | null
  ewallet_provider: string | null
  ewallet_identifier: string | null
  wallet_address: string | null
  is_active: boolean
  is_verified: boolean
}

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

interface VendorRiskAssessmentInsert {
  catering_id: number
  risk_score: number
  risk_level: string
  late_delivery_rate: number
  quality_issue_rate: number
  compliance_rate: number
  avg_quality_score: number
  likely_to_default: number
  recommended_action: string
  total_deliveries: number
  successful_deliveries: number
  issues_reported: number
  assessment_period_start: string
  assessment_period_end: string
  assessed_at: string
}

interface SeedingStats {
  totalCaterings: number
  successPaymentMethods: number
  successMenuItems: number
  successRiskAssessments: number
  failedPaymentMethods: number
  failedMenuItems: number
  failedRiskAssessments: number
  menusByCategory: Record<string, number>
  paymentMethodsByType: Record<string, number>
  riskByLevel: Record<string, number>
  errors: Array<{ type: string; error?: string }>
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  BATCH_SIZE: 100,

  // Menu items per catering
  MIN_MENUS_PER_CATERING: 15,
  MAX_MENUS_PER_CATERING: 30,

  // Payment methods per catering
  PAYMENT_METHODS_PER_CATERING: 2, // Bank + Crypto atau Bank + E-wallet

  // Indonesian banks
  BANKS: [
    { code: 'BCA', name: 'Bank Central Asia' },
    { code: 'BRI', name: 'Bank Rakyat Indonesia' },
    { code: 'BNI', name: 'Bank Negara Indonesia' },
    { code: 'MANDIRI', name: 'Bank Mandiri' },
    { code: 'BTN', name: 'Bank Tabungan Negara' },
    { code: 'CIMB', name: 'Bank CIMB Niaga' },
    { code: 'PERMATA', name: 'Bank Permata' },
    { code: 'DANAMON', name: 'Bank Danamon' },
    { code: 'BNI_SYR', name: 'Bank BNI Syariah' },
    { code: 'BSI', name: 'Bank Syariah Indonesia' },
  ],

  // E-wallet providers
  EWALLETS: ['OVO', 'DANA', 'GoPay', 'LinkAja', 'ShopeePay'],
}

// ============================================================================
// MENU TEMPLATES
// ============================================================================

const MENU_TEMPLATES = [
  // COMPLETE MEALS
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
    serving_size: '1 porsi kotak',
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
    serving_size: '1 piring',
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
    serving_size: '1 porsi',
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
    serving_size: '1 porsi',
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
    serving_size: '1 porsi',
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
    serving_size: '1 porsi',
  },
  // MAIN COURSES
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
    serving_size: '1 potong',
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
    serving_size: '1 porsi',
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
    serving_size: '1 ekor',
  },
  // SOUPS
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
    serving_size: '1 mangkok',
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
    serving_size: '1 mangkok',
  },
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
    serving_size: '1 mangkok',
  },
  // SIDE DISHES
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
    serving_size: '3 potong',
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
    serving_size: '4 potong',
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
    serving_size: '3 buah',
  },
  // SALADS
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
    serving_size: '1 porsi',
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
    serving_size: '1 porsi',
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
    serving_size: '1 porsi',
  },
  // BEVERAGES
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
    serving_size: '1 gelas (250ml)',
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
    serving_size: '1 gelas (200ml)',
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
    serving_size: '1 gelas (300ml)',
  },
  // DESSERTS
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
    serving_size: '1 cup',
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
    serving_size: '3 buah',
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
    serving_size: '1 mangkok',
  },
  // SNACKS
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
    serving_size: '2 buah',
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
    serving_size: '3 buah',
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
    serving_size: '3 buah',
  },
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

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function generateAccountNumber(): string {
  // Generate random 10-16 digit account number
  const length = randomInt(10, 16)
  let number = ''
  for (let i = 0; i < length; i++) {
    number += Math.floor(Math.random() * 10)
  }
  return number
}

function generateEwalletIdentifier(): string {
  // Generate random phone number for e-wallet
  const prefixes = ['0812', '0813', '0821', '0822', '0851', '0852']
  const prefix = randomElement(prefixes)
  const middle = Math.floor(1000 + Math.random() * 9000)
  const last = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}${middle}${last}`
}

// ============================================================================
// DATA GENERATION
// ============================================================================

function generatePaymentMethods(catering: Catering): PaymentMethodInsert[] {
  const methods: PaymentMethodInsert[] = []

  // Method 1: Bank Transfer (always)
  const bank = randomElement(CONFIG.BANKS)
  methods.push({
    catering_id: catering.id,
    method_type: 'BANK_TRANSFER',
    bank_code: bank.code,
    account_number: generateAccountNumber(),
    account_holder_name: catering.company_name,
    ewallet_provider: null,
    ewallet_identifier: null,
    wallet_address: null,
    is_active: true,
    is_verified: true,
  })

  // Method 2: Random (Crypto or E-wallet)
  const useEwallet = Math.random() > 0.5

  if (useEwallet) {
    const ewallet = randomElement(CONFIG.EWALLETS)
    methods.push({
      catering_id: catering.id,
      method_type: 'EWALLET',
      bank_code: null,
      account_number: null,
      account_holder_name: null,
      ewallet_provider: ewallet,
      ewallet_identifier: generateEwalletIdentifier(),
      wallet_address: null,
      is_active: true,
      is_verified: true,
    })
  } else {
    methods.push({
      catering_id: catering.id,
      method_type: 'CRYPTOCURRENCY',
      bank_code: null,
      account_number: null,
      account_holder_name: null,
      ewallet_provider: null,
      ewallet_identifier: null,
      wallet_address: catering.wallet_address,
      is_active: true,
      is_verified: true,
    })
  }

  return methods
}

function selectRandomMenus(count: number): MenuItemInsert[] {
  const selected: any[] = []
  const templates = [...MENU_TEMPLATES]

  // Shuffle and select
  for (let i = 0; i < count && templates.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * templates.length)
    const template = templates.splice(randomIndex, 1)[0]

    // Add small variations to price and nutrition
    const priceVariation = randomInt(-2000, 3000)
    const calorieVariation = randomInt(-20, 40)

    selected.push({
      ...template,
      price: Math.max(5000, template.price + priceVariation),
      calories: template.calories + calorieVariation,
    })
  }

  // If we need more menus than templates, duplicate with variations
  while (selected.length < count) {
    const baseTemplate = randomElement(MENU_TEMPLATES)
    const variation = {
      ...baseTemplate,
      name: `${baseTemplate.name} ${randomElement(['Premium', 'Ekonomis', 'Spesial', 'Reguler'])}`,
      price: baseTemplate.price + randomInt(-3000, 5000),
      calories: baseTemplate.calories + randomInt(-30, 50),
    }
    selected.push(variation)
  }

  return selected
}

function generateMenuItems(catering: Catering): MenuItemInsert[] {
  const menuCount = randomInt(CONFIG.MIN_MENUS_PER_CATERING, CONFIG.MAX_MENUS_PER_CATERING)
  const selectedMenus = selectRandomMenus(menuCount)

  return selectedMenus.map(menu => ({
    catering_id: catering.id,
    name: menu.name,
    description: menu.description,
    category: menu.category,
    price: menu.price,
    calories: menu.calories,
    protein: menu.protein,
    carbohydrates: menu.carbohydrates,
    fat: menu.fat,
    fiber: menu.fiber,
    vitamins: menu.vitamins,
    minerals: menu.minerals,
    allergens: menu.allergens,
    image_url: null,
    is_available: Math.random() > 0.1, // 90% available
    is_halal: true,
    preparation_time: menu.preparation_time,
    serving_size: menu.serving_size,
  }))
}

function generateRiskAssessment(catering: Catering): VendorRiskAssessmentInsert {
  // Generate realistic risk metrics
  const lateDeliveryRate = Math.random() * 0.15 // 0-15%
  const qualityIssueRate = Math.random() * 0.10 // 0-10%
  const complianceRate = 0.80 + Math.random() * 0.20 // 80-100%

  const avgQualityScore = 3.5 + Math.random() * 1.5 // 3.5-5.0

  // Calculate risk score (0-100, higher = worse)
  const riskScore = Math.round(
    lateDeliveryRate * 30 + // Late delivery impact: 30%
    qualityIssueRate * 40 + // Quality issue impact: 40%
    (1 - complianceRate) * 30 // Compliance impact: 30%
  * 100)

  let riskLevel: string
  if (riskScore < 25) riskLevel = 'low'
  else if (riskScore < 50) riskLevel = 'medium'
  else if (riskScore < 75) riskLevel = 'high'
  else riskLevel = 'critical'

  const likelyToDefault = Math.min(1, riskScore / 100 * Math.random())

  let recommendedAction: string
  if (riskLevel === 'low') {
    recommendedAction = 'Continue monitoring regular performance'
  } else if (riskLevel === 'medium') {
    recommendedAction = 'Increase monitoring frequency, provide vendor support'
  } else if (riskLevel === 'high') {
    recommendedAction = 'Urgent investigation required, consider contract review'
  } else {
    recommendedAction = 'Immediate action required, suspend new allocations pending investigation'
  }

  const totalDeliveries = randomInt(50, 500)
  const successfulDeliveries = Math.round(totalDeliveries * (1 - lateDeliveryRate - qualityIssueRate))
  const issuesReported = Math.round(totalDeliveries * qualityIssueRate)

  const now = new Date()
  const startDate = new Date(now)
  startDate.setMonth(startDate.getMonth() - 3) // 3 months ago

  return {
    catering_id: catering.id,
    risk_score: riskScore,
    risk_level: riskLevel,
    late_delivery_rate: parseFloat(lateDeliveryRate.toFixed(4)),
    quality_issue_rate: parseFloat(qualityIssueRate.toFixed(4)),
    compliance_rate: parseFloat(complianceRate.toFixed(4)),
    avg_quality_score: parseFloat(avgQualityScore.toFixed(2)),
    likely_to_default: parseFloat(likelyToDefault.toFixed(2)),
    recommended_action: recommendedAction,
    total_deliveries: totalDeliveries,
    successful_deliveries: successfulDeliveries,
    issues_reported: issuesReported,
    assessment_period_start: startDate.toISOString().split('T')[0],
    assessment_period_end: now.toISOString().split('T')[0],
    assessed_at: now.toISOString(),
  }
}

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function seedCateringCompleteData() {
  logger.log('='.repeat(80))
  logger.log('SEEDING SCRIPT 43: CATERING COMPLETE DATA')
  logger.log('='.repeat(80))

  const stats: SeedingStats = {
    totalCaterings: 0,
    successPaymentMethods: 0,
    successMenuItems: 0,
    successRiskAssessments: 0,
    failedPaymentMethods: 0,
    failedMenuItems: 0,
    failedRiskAssessments: 0,
    menusByCategory: {},
    paymentMethodsByType: {},
    riskByLevel: {},
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
    // ========================================================================
    // STEP 1: Fetch Caterings
    // ========================================================================
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 1: FETCHING CATERINGS')
    logger.log('='.repeat(80))

    const { data: caterings, error: cateringsError } = await supabase
      .from('caterings')
      .select('id, name, company_name, wallet_address, email')
      .order('id')

    if (cateringsError) {
      throw new Error(`Failed to fetch caterings: ${cateringsError.message}`)
    }

    if (!caterings || caterings.length === 0) {
      throw new Error('No caterings found. Please run 01-seed-users.ts first.')
    }

    stats.totalCaterings = caterings.length
    logger.success(`Found ${caterings.length} caterings`)

    // ========================================================================
    // STEP 2: Generate and Insert Payment Methods
    // ========================================================================
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 2: GENERATING AND INSERTING PAYMENT METHODS')
    logger.log('='.repeat(80))

    const allPaymentMethods: PaymentMethodInsert[] = []

    for (const catering of caterings) {
      const methods = generatePaymentMethods(catering)
      allPaymentMethods.push(...methods)
      methods.forEach(m => {
        stats.paymentMethodsByType[m.method_type] = (stats.paymentMethodsByType[m.method_type] || 0) + 1
      })
    }

    logger.log(`Generated ${allPaymentMethods.length} payment methods`)

    // Insert in batches
    for (let i = 0; i < allPaymentMethods.length; i += CONFIG.BATCH_SIZE) {
      const batch = allPaymentMethods.slice(i, i + CONFIG.BATCH_SIZE)

      try {
        const { data, error } = await supabase
          .from('payment_methods')
          .insert(batch)
          .select('id')

        if (error) {
          logger.error(`Payment methods batch failed`, error)
          stats.failedPaymentMethods += batch.length
          stats.errors.push({ type: 'payment_method', error: error.message })
        } else {
          stats.successPaymentMethods += data.length
          logger.progress(
            Math.min(i + CONFIG.BATCH_SIZE, allPaymentMethods.length),
            allPaymentMethods.length,
            'Inserting payment methods'
          )
        }
      } catch (error) {
        logger.error(`Payment methods batch exception`, error)
        stats.failedPaymentMethods += batch.length
        stats.errors.push({
          type: 'payment_method',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }

      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // ========================================================================
    // STEP 3: Generate and Insert Menu Items
    // ========================================================================
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 3: GENERATING AND INSERTING MENU ITEMS')
    logger.log('='.repeat(80))

    const allMenuItems: MenuItemInsert[] = []

    for (const catering of caterings) {
      const menus = generateMenuItems(catering)
      allMenuItems.push(...menus)
      menus.forEach(m => {
        stats.menusByCategory[m.category] = (stats.menusByCategory[m.category] || 0) + 1
      })
    }

    logger.log(`Generated ${allMenuItems.length} menu items`)

    // Insert in batches
    for (let i = 0; i < allMenuItems.length; i += CONFIG.BATCH_SIZE) {
      const batch = allMenuItems.slice(i, i + CONFIG.BATCH_SIZE)

      try {
        const { data, error } = await supabase
          .from('menu_items')
          .insert(batch)
          .select('id')

        if (error) {
          logger.error(`Menu items batch failed`, error)
          stats.failedMenuItems += batch.length
          stats.errors.push({ type: 'menu_item', error: error.message })
        } else {
          stats.successMenuItems += data.length
          logger.progress(
            Math.min(i + CONFIG.BATCH_SIZE, allMenuItems.length),
            allMenuItems.length,
            'Inserting menu items'
          )
        }
      } catch (error) {
        logger.error(`Menu items batch exception`, error)
        stats.failedMenuItems += batch.length
        stats.errors.push({
          type: 'menu_item',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }

      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // ========================================================================
    // STEP 4: Generate and Insert Vendor Risk Assessments
    // ========================================================================
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 4: GENERATING AND INSERTING VENDOR RISK ASSESSMENTS')
    logger.log('='.repeat(80))

    const riskAssessments: VendorRiskAssessmentInsert[] = []

    for (const catering of caterings) {
      const assessment = generateRiskAssessment(catering)
      riskAssessments.push(assessment)
      stats.riskByLevel[assessment.risk_level] = (stats.riskByLevel[assessment.risk_level] || 0) + 1
    }

    logger.log(`Generated ${riskAssessments.length} risk assessments`)

    // Insert in batches
    for (let i = 0; i < riskAssessments.length; i += CONFIG.BATCH_SIZE) {
      const batch = riskAssessments.slice(i, i + CONFIG.BATCH_SIZE)

      try {
        const { data, error } = await supabase
          .from('vendor_risk_assessments')
          .insert(batch)
          .select('id')

        if (error) {
          logger.error(`Risk assessments batch failed`, error)
          stats.failedRiskAssessments += batch.length
          stats.errors.push({ type: 'risk_assessment', error: error.message })
        } else {
          stats.successRiskAssessments += data.length
          logger.progress(
            Math.min(i + CONFIG.BATCH_SIZE, riskAssessments.length),
            riskAssessments.length,
            'Inserting risk assessments'
          )
        }
      } catch (error) {
        logger.error(`Risk assessments batch exception`, error)
        stats.failedRiskAssessments += batch.length
        stats.errors.push({
          type: 'risk_assessment',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }

      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // ========================================================================
    // STEP 5: Update caterings with latest risk assessment
    // ========================================================================
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 5: UPDATING CATERINGS WITH RISK LEVELS')
    logger.log('='.repeat(80))

    let updatedCaterings = 0

    for (let i = 0; i < caterings.length; i++) {
      const catering = caterings[i]
      const assessment = riskAssessments[i]

      try {
        const { error } = await supabase
          .from('caterings')
          .update({
            risk_level: assessment.risk_level,
          })
          .eq('id', catering.id)

        if (!error) {
          updatedCaterings++
        }
      } catch (error) {
        // Ignore update errors
      }
    }

    logger.success(`Updated ${updatedCaterings} caterings with risk levels`)

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    logger.log('\n' + '='.repeat(80))
    logger.log('SEEDING SUMMARY')
    logger.log('='.repeat(80))

    console.log(`
📊 CATERINGS PROCESSED: ${stats.totalCaterings}

📊 PAYMENT METHODS:
   ✅ Success: ${stats.successPaymentMethods}
   ❌ Failed: ${stats.failedPaymentMethods}

   By Type:`)
    Object.entries(stats.paymentMethodsByType).forEach(([type, count]) => {
      console.log(`     ${type.padEnd(20)}: ${count}`)
    })

    console.log(`
📊 MENU ITEMS:
   ✅ Success: ${stats.successMenuItems}
   ❌ Failed: ${stats.failedMenuItems}

   By Category:`)
    Object.entries(stats.menusByCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        const percentage = ((count / stats.successMenuItems) * 100).toFixed(1)
        console.log(`     ${category.padEnd(20)}: ${count.toString().padStart(4)} (${percentage}%)`)
      })

    console.log(`
📊 VENDOR RISK ASSESSMENTS:
   ✅ Success: ${stats.successRiskAssessments}
   ❌ Failed: ${stats.failedRiskAssessments}

   By Risk Level:`)
    Object.entries(stats.riskByLevel)
      .sort((a, b) => {
        const order = { low: 0, medium: 1, high: 2, critical: 3 }
        return (order[a[0] as keyof typeof order] || 0) - (order[b[0] as keyof typeof order] || 0)
      })
      .forEach(([level, count]) => {
        const percentage = ((count / stats.successRiskAssessments) * 100).toFixed(1)
        console.log(`     ${level.padEnd(20)}: ${count.toString().padStart(4)} (${percentage}%)`)
      })

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
    const statsPath = path.join(__dirname, '../seeding-logs/43-catering-complete-data-stats.json')
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
  seedCateringCompleteData()
    .then(() => {
      logger.success('Script execution completed')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('Script execution failed', error)
      process.exit(1)
    })
}

export { seedCateringCompleteData }
