// @ts-nocheck
/**
 * BPS Data Integration Service
 *
 * Fetches real-time poverty and demographic data from BPS (Badan Pusat Statistik)
 * API: https://webapi.bps.go.id/
 *
 * Note: BPS API may require registration for API key
 * Fallback to cached/simulated data if API unavailable
 */

import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { supabase } from '../config/database.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface PovertyData {
  province: string;
  provinceCode: string;
  year: number;
  month?: number;
  povertyRate: number; // Percentage (0-100)
  povertyCount: number; // Number of people
  giniRatio: number; // 0-1 (income inequality)
  lastUpdated: Date;
  source: 'bps_api' | 'cached' | 'simulated';
}

export interface DemographicData {
  province: string;
  provinceCode: string;
  population: number;
  schoolAgeChildren: number; // Ages 6-12
  urbanRatio: number; // 0-1
  ruralRatio: number; // 0-1
}

// ============================================
// BPS API CLIENT
// ============================================

class BPSAPIClient {
  private client: AxiosInstance;
  private apiKey: string | null;
  private baseURL = 'https://webapi.bps.go.id/v1/api';

  constructor() {
    this.apiKey = process.env.BPS_API_KEY || null;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add API key to requests if available
    if (this.apiKey) {
      this.client.interceptors.request.use(config => {
        config.params = {
          ...config.params,
          key: this.apiKey,
        };
        return config;
      });
    }
  }

  /**
   * Fetch poverty data for a province
   * Indicator: 23 = Jumlah Penduduk Miskin (Ribu Jiwa)
   * Indicator: 26 = Persentase Penduduk Miskin
   */
  async fetchPovertyData(provinceCode: string, year: number = 2024): Promise<any> {
    try {
      // BPS API endpoint for poverty statistics
      const response = await this.client.get('/interoperabilitas/datastatistik', {
        params: {
          kode_prov: provinceCode,
          tahun: year,
          kode_ind: 26, // Poverty percentage indicator
        },
      });

      return response.data;
    } catch (error: any) {
      console.error(`[BPS API] Failed to fetch poverty data:`, error.message);
      return null;
    }
  }

  /**
   * Fetch Gini ratio (income inequality)
   * Indicator: 184 = Gini Ratio
   */
  async fetchGiniRatio(provinceCode: string, year: number = 2024): Promise<number | null> {
    try {
      const response = await this.client.get('/interoperabilitas/datastatistik', {
        params: {
          kode_prov: provinceCode,
          tahun: year,
          kode_ind: 184,
        },
      });

      if (response.data && response.data.data && response.data.data.length > 0) {
        return parseFloat(response.data.data[0].value);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if API is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/list', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// Singleton instance
const bpsClient = new BPSAPIClient();

// ============================================
// PROVINCE CODE MAPPING
// ============================================

const PROVINCE_CODES: Record<string, string> = {
  'Aceh': '11',
  'Sumatera Utara': '12',
  'Sumatera Barat': '13',
  'Riau': '14',
  'Jambi': '15',
  'Sumatera Selatan': '16',
  'Bengkulu': '17',
  'Lampung': '18',
  'Kepulauan Bangka Belitung': '19',
  'Kepulauan Riau': '21',
  'DKI Jakarta': '31',
  'Jawa Barat': '32',
  'Jawa Tengah': '33',
  'DI Yogyakarta': '34',
  'Jawa Timur': '35',
  'Banten': '36',
  'Bali': '51',
  'Nusa Tenggara Barat': '52',
  'Nusa Tenggara Timur': '53',
  'Kalimantan Barat': '61',
  'Kalimantan Tengah': '62',
  'Kalimantan Selatan': '63',
  'Kalimantan Timur': '64',
  'Kalimantan Utara': '65',
  'Sulawesi Utara': '71',
  'Sulawesi Tengah': '72',
  'Sulawesi Selatan': '73',
  'Sulawesi Tenggara': '74',
  'Gorontalo': '75',
  'Sulawesi Barat': '76',
  'Maluku': '81',
  'Maluku Utara': '82',
  'Papua Barat': '91',
  'Papua': '94',
};

// ============================================
// FALLBACK DATA (used when API unavailable)
// ============================================

const FALLBACK_POVERTY_DATA: Record<string, number> = {
  'Papua': 26.80,
  'Papua Barat': 21.70,
  'Nusa Tenggara Timur': 19.96,
  'Maluku': 17.69,
  'Gorontalo': 15.52,
  'Aceh': 15.01,
  'Bengkulu': 14.89,
  'Nusa Tenggara Barat': 13.38,
  'Sulawesi Tengah': 12.82,
  'Lampung': 12.34,
  'Sumatera Selatan': 12.20,
  'Sulawesi Barat': 11.22,
  'Jambi': 10.42,
  'Kalimantan Barat': 10.11,
  'DI Yogyakarta': 10.09,
  'Sulawesi Selatan': 9.62,
  'Jawa Timur': 9.59,
  'Jawa Tengah': 9.57,
  'Sulawesi Tenggara': 9.02,
  'Jawa Barat': 7.68,
  'Kalimantan Tengah': 7.42,
  'Sumatera Barat': 6.90,
  'Sulawesi Utara': 6.89,
  'Banten': 5.42,
  'Kepulauan Riau': 5.35,
  'Riau': 5.30,
  'Sumatera Utara': 8.75,
  'Maluku Utara': 6.27,
  'Kalimantan Timur': 5.68,
  'Kalimantan Utara': 6.16,
  'Kalimantan Selatan': 4.45,
  'Bali': 4.14,
  'DKI Jakarta': 3.47,
  'Kepulauan Bangka Belitung': 4.55,
};

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Get poverty data with automatic fallback
 */
export async function getPovertyData(
  province: string,
  useCache: boolean = true
): Promise<PovertyData> {
  const provinceCode = PROVINCE_CODES[province];
  const currentYear = new Date().getFullYear();

  // Try cache first if enabled
  if (useCache) {
    const cached = await getCachedPovertyData(province);
    if (cached && isDataFresh(cached.lastUpdated, 30)) { // 30 days freshness
      return cached;
    }
  }

  // Try BPS API
  if (provinceCode) {
    try {
      const apiData = await bpsClient.fetchPovertyData(provinceCode, currentYear);

      if (apiData && apiData.data && apiData.data.length > 0) {
        const povertyRate = parseFloat(apiData.data[0].value);
        const giniRatio = await bpsClient.fetchGiniRatio(provinceCode, currentYear) || 0.35;

        const data: PovertyData = {
          province,
          provinceCode,
          year: currentYear,
          povertyRate,
          povertyCount: 0, // Would need population data to calculate
          giniRatio,
          lastUpdated: new Date(),
          source: 'bps_api',
        };

        // Cache the result
        await cachePovertyData(data);

        console.log(`[BPS Service] Fetched live data for ${province}: ${povertyRate}%`);
        return data;
      }
    } catch (error) {
      console.error(`[BPS Service] API call failed for ${province}:`, error);
    }
  }

  // Fallback to simulated data
  const povertyRate = FALLBACK_POVERTY_DATA[province] || 10.0;

  const fallbackData: PovertyData = {
    province,
    provinceCode: provinceCode || '00',
    year: currentYear,
    povertyRate,
    povertyCount: 0,
    giniRatio: 0.35, // National average
    lastUpdated: new Date(),
    source: provinceCode ? 'simulated' : 'simulated',
  };

  console.log(`[BPS Service] Using fallback data for ${province}: ${povertyRate}%`);
  return fallbackData;
}

/**
 * Batch fetch poverty data for all provinces
 */
export async function getAllProvincePovertyData(): Promise<PovertyData[]> {
  const provinces = Object.keys(PROVINCE_CODES);
  const results: PovertyData[] = [];

  console.log(`[BPS Service] Fetching poverty data for ${provinces.length} provinces...`);

  // Fetch in batches to avoid overwhelming API
  const batchSize = 5;
  for (let i = 0; i < provinces.length; i += batchSize) {
    const batch = provinces.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(province => getPovertyData(province))
    );
    results.push(...batchResults);

    // Small delay between batches
    if (i + batchSize < provinces.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`[BPS Service] Completed fetching data for ${results.length} provinces`);
  return results;
}

/**
 * Get poverty index score (0-100, higher = worse poverty)
 * Combines poverty rate and Gini ratio
 */
export function calculatePovertyIndex(data: PovertyData): number {
  // Normalize poverty rate to 0-100 scale
  // Indonesia's range: ~3% (Jakarta) to ~27% (Papua)
  const normalizedPoverty = Math.min(100, (data.povertyRate / 27) * 100);

  // Normalize Gini ratio to 0-100 scale
  // Gini range: 0.3 to 0.5 typically
  const normalizedGini = Math.min(100, ((data.giniRatio - 0.3) / 0.2) * 100);

  // Weighted combination (poverty rate is more important)
  const index = (normalizedPoverty * 0.7) + (normalizedGini * 0.3);

  return Math.min(100, Math.max(0, index));
}

// ============================================
// CACHING FUNCTIONS
// ============================================

/**
 * Cache poverty data in database
 */
async function cachePovertyData(data: PovertyData): Promise<void> {
  try {
    const { error } = await supabase
      .from('poverty_data_cache')
      .upsert({
        province: data.province,
        province_code: data.provinceCode,
        year: data.year,
        month: data.month || null,
        poverty_rate: data.povertyRate,
        poverty_count: data.povertyCount,
        gini_ratio: data.giniRatio,
        last_updated: data.lastUpdated.toISOString(),
        source: data.source,
      }, {
        onConflict: 'province,year'
      });

    if (error && !error.message.includes('does not exist')) {
      console.error('[BPS Service] Failed to cache poverty data:', error);
    }
  } catch (error: any) {
    // Table might not exist yet - not critical
    if (!error.message.includes('relation "poverty_data_cache" does not exist')) {
      console.error('[BPS Service] Failed to cache poverty data:', error);
    }
  }
}

/**
 * Get cached poverty data
 */
async function getCachedPovertyData(province: string): Promise<PovertyData | null> {
  try {
    const { data, error } = await supabase
      .from('poverty_data_cache')
      .select('*')
      .eq('province', province)
      .order('year', { ascending: false })
      .order('last_updated', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      province: data.province,
      provinceCode: data.province_code,
      year: data.year,
      month: data.month,
      povertyRate: parseFloat(data.poverty_rate),
      povertyCount: parseInt(data.poverty_count),
      giniRatio: parseFloat(data.gini_ratio),
      lastUpdated: new Date(data.last_updated),
      source: data.source,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Check if cached data is fresh
 */
function isDataFresh(lastUpdated: Date, maxAgeDays: number): boolean {
  const ageMs = Date.now() - lastUpdated.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays <= maxAgeDays;
}

// ============================================
// HEALTH CHECK
// ============================================

/**
 * Check BPS API availability
 */
export async function checkBPSAPIHealth(): Promise<{
  available: boolean;
  message: string;
}> {
  const isAvailable = await bpsClient.healthCheck();

  return {
    available: isAvailable,
    message: isAvailable
      ? 'BPS API is available'
      : 'BPS API unavailable - using fallback data',
  };
}

// ============================================
// EXPORT
// ============================================

export default {
  getPovertyData,
  getAllProvincePovertyData,
  calculatePovertyIndex,
  checkBPSAPIHealth,
  PROVINCE_CODES,
};
