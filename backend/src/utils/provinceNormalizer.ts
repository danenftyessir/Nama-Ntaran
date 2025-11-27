// @ts-nocheck
/**
 * Province Name Normalizer
 *
 * Handles different formats of Indonesian province names
 * to match data from different sources
 */

// Mapping from various formats to standard format
const PROVINCE_MAPPINGS: Record<string, string> = {
  // DKI Jakarta variants
  'D.K.I. Jakarta': 'DKI Jakarta',
  'D.K.I Jakarta': 'DKI Jakarta',
  'DKI JAKARTA': 'DKI Jakarta',
  'Jakarta': 'DKI Jakarta',

  // DI Yogyakarta variants
  'D.I. Yogyakarta': 'DI Yogyakarta',
  'D.I Yogyakarta': 'DI Yogyakarta',
  'DI YOGYAKARTA': 'DI Yogyakarta',
  'Yogyakarta': 'DI Yogyakarta',

  // Standardize other provinces (convert to Title Case)
  'JAWA BARAT': 'Jawa Barat',
  'JAWA TENGAH': 'Jawa Tengah',
  'JAWA TIMUR': 'Jawa Timur',
  'SUMATERA UTARA': 'Sumatera Utara',
  'SUMATERA BARAT': 'Sumatera Barat',
  'SUMATERA SELATAN': 'Sumatera Selatan',
  'KALIMANTAN BARAT': 'Kalimantan Barat',
  'KALIMANTAN TENGAH': 'Kalimantan Tengah',
  'KALIMANTAN SELATAN': 'Kalimantan Selatan',
  'KALIMANTAN TIMUR': 'Kalimantan Timur',
  'KALIMANTAN UTARA': 'Kalimantan Utara',
  'SULAWESI UTARA': 'Sulawesi Utara',
  'SULAWESI TENGAH': 'Sulawesi Tengah',
  'SULAWESI SELATAN': 'Sulawesi Selatan',
  'SULAWESI TENGGARA': 'Sulawesi Tenggara',
  'SULAWESI BARAT': 'Sulawesi Barat',
  'NUSA TENGGARA BARAT': 'Nusa Tenggara Barat',
  'NUSA TENGGARA TIMUR': 'Nusa Tenggara Timur',
  'MALUKU': 'Maluku',
  'MALUKU UTARA': 'Maluku Utara',
  'PAPUA': 'Papua',
  'PAPUA BARAT': 'Papua Barat',
  'ACEH': 'Aceh',
  'BANTEN': 'Banten',
  'BALI': 'Bali',
  'BENGKULU': 'Bengkulu',
  'GORONTALO': 'Gorontalo',
  'JAMBI': 'Jambi',
  'LAMPUNG': 'Lampung',
  'KEPULAUAN RIAU': 'Kepulauan Riau',
  'KEPULAUAN BANGKA BELITUNG': 'Kepulauan Bangka Belitung',
  'RIAU': 'Riau',
};

/**
 * Normalize province name to match stunting data format
 */
export function normalizeProvinceName(provinceName: string | null): string {
  if (!provinceName) return '';

  // Trim whitespace
  let normalized = provinceName.trim();

  // Check exact mapping first
  if (PROVINCE_MAPPINGS[normalized]) {
    return PROVINCE_MAPPINGS[normalized];
  }

  // Check uppercase version
  const upper = normalized.toUpperCase();
  if (PROVINCE_MAPPINGS[upper]) {
    return PROVINCE_MAPPINGS[upper];
  }

  // Try to match with dots removed
  const noDots = normalized.replace(/\./g, '');
  if (PROVINCE_MAPPINGS[noDots]) {
    return PROVINCE_MAPPINGS[noDots];
  }

  // Return as-is if no mapping found
  return normalized;
}

/**
 * Test if two province names are equivalent
 */
export function provincesMatch(name1: string | null, name2: string | null): boolean {
  const normalized1 = normalizeProvinceName(name1);
  const normalized2 = normalizeProvinceName(name2);

  return normalized1 === normalized2;
}
