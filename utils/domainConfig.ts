/**
 * Domain Configuration Utility
 * Uses static in-project brand configuration (no Supabase calls).
 */

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

// Default biocloud configuration (fallback)
const DEFAULT_BIOCLOUD_CONFIG: DomainConfig = {
  domain: 'dental.bio',
  brandName: 'Dentalbio',
  logoPath: '/logo.svg',
  emailFrom: 'Dentalbio',
  supportEmail: 'Support',
  contactEmail: 'hello@biocloud.com',
  baseUrl: 'https://dental.bio',
  tagline: 'Your professional dental identity.',
}

// Static brand configurations stored in the project
const STATIC_BRANDS: DomainConfig[] = [
  {
    domain: 'dental.bio',
    brandName: 'Dentalbio',
    logoPath: '/logo.svg',
    emailFrom: 'Dentalbio',
    supportEmail: 'Support',
    contactEmail: 'hello@biocloud.com',
    baseUrl: 'https://dental.bio',
    tagline: 'Your professional dental identity.',
  },
  {
    domain: 'doctors.bio',
    brandName: 'Doctors.bio',
    logoPath: '/logo.svg',
    emailFrom: 'Doctors.bio',
    supportEmail: 'Support',
    contactEmail: 'hello@biocloud.com',
    baseUrl: 'https://doctors.bio',
    tagline: 'Your professional doctor identity.',
  },
  {
    domain: 'injector.bio',
    brandName: 'Injector.bio',
    logoPath: '/logo.svg',
    emailFrom: 'Injector.bio',
    supportEmail: 'Support',
    contactEmail: 'hello@biocloud.com',
    baseUrl: 'https://injector.bio',
    tagline: 'Your professional injector identity.',
  },
  {
    domain: 'pharmacists.bio',
    brandName: 'Pharmacists.bio',
    logoPath: '/logo.svg',
    emailFrom: 'Pharmacists.bio',
    supportEmail: 'Support',
    contactEmail: 'hello@biocloud.com',
    baseUrl: 'https://pharmacists.bio',
    tagline: 'Your professional pharmacist identity.',
  },
];

function getBrandFromStatic(domain: string): DomainConfig | null {
  const hostname = domain.toLowerCase();
  const brand = STATIC_BRANDS.find((b) => b.domain.toLowerCase() === hostname);
  return brand ?? null;
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
 * Uses static in-project configuration (no database calls).
 */
export async function getDomainConfig(headers?: Headers | { get: (key: string) => string | null }): Promise<DomainConfig> {
  const hostname = getCurrentHostname(headers);
  const config = getBrandFromStatic(hostname);

  if (!config) {
    // Fallback to biocloud if domain not found
    console.warn(`Domain configuration not found for ${hostname}, using biocloud default`);
    return DEFAULT_BIOCLOUD_CONFIG;
  }

  return config;
}

/**
 * Get domain configuration for a specific hostname (server-side)
 * Uses static in-project configuration (no database calls).
 */
export async function getDomainConfigByHostname(hostname: string): Promise<DomainConfig> {
  const config = getBrandFromStatic(hostname);
  if (!config) {
    return DEFAULT_BIOCLOUD_CONFIG;
  }
  return config;
}

/**
 * Get all configured domains (server-side)
 * Uses static in-project configuration.
 */
export async function getAllDomains(): Promise<string[]> {
  return STATIC_BRANDS.map((b) => b.domain);
}

/**
 * Invalidate the brands cache (call this after updating brands in database)
 * No-op when using static configuration.
 */
export function invalidateBrandsCache(): void {
  // Intentionally empty
}

