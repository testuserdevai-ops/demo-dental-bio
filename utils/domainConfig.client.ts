/**
 * Client-side Domain Configuration Utility
 * Fetches brand configurations from Supabase (client-side)
 */

'use client';

import { createClient } from '@/utils/supabase/client';

export interface DomainConfig {
  domain: string;
  brandName: string;
  logoPath: string;
  emailFrom: string;
  supportEmail: string;
  contactEmail: string;
  baseUrl: string;
  tagline?: string;
  gaTrackingId?: string;
}

// Email configuration - all emails sent from biocloud.com
export const EMAIL_CONFIG = {
  from: 'noreply@biocloud.com',
  support: 'support@biocloud.com',
  contact: 'hello@biocloud.com',
} as const;

// Default biocloud configuration (fallback)
const DEFAULT_BIOCLOUD_CONFIG: DomainConfig = {
  domain: 'biocloud.com',
  brandName: 'Biocloud',
  logoPath: '/logo.svg',
  emailFrom: 'Biocloud',
  supportEmail: 'Support',
  contactEmail: 'hello@biocloud.com',
  baseUrl: 'https://biocloud.com',
  tagline: 'Your professional identity, simplified.',
};

// Cache for brand configurations (client-side cache)
let brandsCache: Map<string, DomainConfig> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

/**
 * Fetch all brands from Supabase and cache them (client-side)
 */
async function fetchBrandsFromDatabase(): Promise<Map<string, DomainConfig>> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (brandsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return brandsCache;
  }

  try {
    const supabase = createClient();
    const { data: brands, error } = await supabase
      .from('brands')
      .select('domain, brand_name, logo_path, email_from, base_url, tagline, ga_tracking_id')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching brands from database:', error);
      // Return cache if available, otherwise return empty map
      if (brandsCache) {
        return brandsCache;
      }
      return new Map();
    }

    // Convert to Map for fast lookups
    const brandsMap = new Map<string, DomainConfig>();
    
    if (brands) {
      for (const brand of brands) {
        brandsMap.set(brand.domain, {
          domain: brand.domain,
          brandName: brand.brand_name,
          logoPath: brand.logo_path,
          emailFrom: brand.email_from,
          supportEmail: 'Support',
          contactEmail: EMAIL_CONFIG.contact,
          baseUrl: brand.base_url,
          tagline: brand.tagline || undefined,
          gaTrackingId: brand.ga_tracking_id || undefined,
        });
      }
    }

    // Update cache
    brandsCache = brandsMap;
    cacheTimestamp = now;

    return brandsMap;
  } catch (error) {
    console.error('Error fetching brands:', error);
    // Return cache if available
    if (brandsCache) {
      return brandsCache;
    }
    return new Map();
  }
}

/**
 * Get brand configuration for a specific domain from database (client-side)
 */
async function getBrandFromDatabase(domain: string): Promise<DomainConfig | null> {
  try {
    const brands = await fetchBrandsFromDatabase();
    return brands.get(domain) || null;
  } catch (error) {
    console.error('Error getting brand from database:', error);
    return null;
  }
}

/**
 * Get domain configuration for a specific hostname (client-side)
 */
export async function getDomainConfigByHostname(hostname: string): Promise<DomainConfig> {
  const config = await getBrandFromDatabase(hostname);
  if (!config) {
    return DEFAULT_BIOCLOUD_CONFIG;
  }
  return config;
}

