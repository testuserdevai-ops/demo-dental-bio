/**
 * Domain Configuration Utility
 * Uses static in-project brand configuration (no Supabase calls).
 */

export interface DomainConfig {
  domain: string;
  brandName: string;
  vertical: string;
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
  vertical: 'dental',
  logoPath: '/logos/dentalbio.svg',
  emailFrom: 'Dentalbio',
  supportEmail: 'Support',
  contactEmail: 'hello@biocloud.com',
  baseUrl: 'https://dental.bio',
  tagline: 'Your professional dental identity.',
}

// Static brand configurations stored in the project
const STATIC_BRANDS: DomainConfig[] = [
  {
    domain: 'coach.bio',
    brandName: 'Coachbio',
    vertical: 'coaching',
    logoPath: '/logos/coachbio.svg',
    emailFrom: 'Coachbio',
    supportEmail: 'Support',
    contactEmail: 'hello@biocloud.com',
    baseUrl: 'https://coachbio',
    tagline: 'Your professional coach identity.',
  },
  {
    domain: 'dental.bio',
    brandName: 'Dentalbio',
    vertical: 'dental',
    logoPath: '/logos/dentalbio.svg',
    emailFrom: 'Dentalbio',
    supportEmail: 'Support',
    contactEmail: 'hello@biocloud.com',
    baseUrl: 'https://dental.bio',
    tagline: 'Your professional dental identity.',
  },
  {
    domain: 'doctors.bio',
    brandName: 'Doctorsbio',
    vertical: 'doctors',
    logoPath: '/logos/doctorsbio.svg',
    emailFrom: 'Doctorsbio',
    supportEmail: 'Support',
    contactEmail: 'hello@biocloud.com',
    baseUrl: 'https://doctors.bio',
    tagline: 'Your professional doctor identity.',
  },
  {
    domain: 'injector.bio',
    brandName: 'Injectorbio',
    vertical: 'injector',
    logoPath: '/logos/injectorbio.svg',
    emailFrom: 'Injectorbio',
    supportEmail: 'Support',
    contactEmail: 'hello@biocloud.com',
    baseUrl: 'https://injector.bio',
    tagline: 'Your professional injector identity.',
  },
  {
    domain: 'pharmacists.bio',
    brandName: 'Pharmacistsbio',
    vertical: 'pharmacists',
    logoPath: '/logos/pharmacistsbio.svg',
    emailFrom: 'Pharmacistsbio',
    supportEmail: 'Support',
    contactEmail: 'hello@biocloud.com',
    baseUrl: 'https://pharmacists.bio',
    tagline: 'Your professional pharmacist identity.',
  },
  {
    domain: 'podcasts.bio',
    brandName: 'Podcastsbio',
    vertical: 'podcasts',
    logoPath: '/logos/podcastsbio.svg',
    emailFrom: 'Podcastsbio',
    supportEmail: 'Support',
    contactEmail: 'hello@biocloud.com',
    baseUrl: 'https://podcasts.bio',
    tagline: 'Your professional podcast identity.',
  },
  {
    domain: 'specialist.bio',
    brandName: 'Specialistbio',
    vertical: 'specialist',
    logoPath: '/logos/specialistbio.svg',
    emailFrom: 'Specialistbio',
    supportEmail: 'Support',
    contactEmail: 'hello@biocloud.com',
    baseUrl: 'https://specialist.bio',
    tagline: 'Your professional specialist identity.',
  },
  {
    domain: 'therapists.bio',
    brandName: 'Therapistsbio',
    vertical: 'therapists',
    logoPath: '/logos/therapistsbio.svg',
    emailFrom: 'Therapistsbio',
    supportEmail: 'Support',
    contactEmail: 'hello@biocloud.com',
    baseUrl: 'https://therapists.bio',
    tagline: 'Your professional therapist identity.',
  },
];

function getBrandFromStatic(domain: string): DomainConfig | null {
  const hostname = domain.toLowerCase();
  const brand = STATIC_BRANDS.find((b) => b.domain.toLowerCase() === hostname);
  return brand ?? DEFAULT_BIOCLOUD_CONFIG;
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
export function getDomainConfig(headers?: Headers | { get: (key: string) => string | null }): DomainConfig {
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
export function getDomainConfigByHostname(hostname: string): DomainConfig {
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
export function getAllDomains(): string[] {
  return STATIC_BRANDS.map((b) => b.domain);
}

/**
 * Invalidate the brands cache (call this after updating brands in database)
 * No-op when using static configuration.
 */
export function invalidateBrandsCache(): void {
  // Intentionally empty
}

