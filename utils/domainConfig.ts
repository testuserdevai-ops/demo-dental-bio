/**
 * Domain Configuration Utility
 * Fetches brand configurations from Supabase database
 */

import { createClient } from '@/utils/supabase/server';

export interface DomainConfig {
  domain: string;
  brandName: string;
  logoPath: string;
  emailFrom: string; // Display name only, actual email uses biocloud.com
  supportEmail: string; // Display name only, actual email uses biocloud.com
  contactEmail: string; // For UI display, actual emails use biocloud.com
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

// Cache for brand configurations (in-memory cache)
let brandsCache: Map<string, DomainConfig> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

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

/**
 * Fetch all brands from Supabase and cache them
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
 * Get brand configuration for a specific domain from database
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
 * Get the current hostname from request headers or environment
 */
export function getCurrentHostname(headers?: Headers | { get: (key: string) => string | null }): string {
  // Try to get from headers (server-side)
  if (headers) {
    const host = headers.get('host') || headers.get('x-forwarded-host');
    if (host) {
      // Remove port if present
      return host.split(':')[0];
    }
  }

  // Fallback to environment variable
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }

  // Last resort: use environment variable
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (baseUrl) {
    try {
      return new URL(baseUrl).hostname;
    } catch {
      // Invalid URL, continue
    }
  }

  // Default fallback to biocloud
  return 'biocloud';
}

/**
 * Get domain configuration for the current request (server-side)
 * Fetches from Supabase database with caching
 */
export async function getDomainConfig(headers?: Headers | { get: (key: string) => string | null }): Promise<DomainConfig> {
  const hostname = getCurrentHostname(headers);
  const config = await getBrandFromDatabase(hostname);

  if (!config) {
    // Fallback to biocloud if domain not found
    console.warn(`Domain configuration not found for ${hostname}, using biocloud default`);
    return DEFAULT_BIOCLOUD_CONFIG;
  }

  return config;
}

/**
 * Get domain configuration for a specific hostname (server-side)
 * Fetches from Supabase database with caching
 */
export async function getDomainConfigByHostname(hostname: string): Promise<DomainConfig> {
  const config = await getBrandFromDatabase(hostname);
  if (!config) {
    return DEFAULT_BIOCLOUD_CONFIG;
  }
  return config;
}

/**
 * Get all configured domains (server-side)
 */
export async function getAllDomains(): Promise<string[]> {
  const brands = await fetchBrandsFromDatabase();
  return Array.from(brands.keys());
}

/**
 * Invalidate the brands cache (call this after updating brands in database)
 */
export function invalidateBrandsCache(): void {
  brandsCache = null;
  cacheTimestamp = 0;
}

