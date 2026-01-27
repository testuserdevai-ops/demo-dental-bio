/**
 * Domain Configuration Utility
 * Uses static in-project brand configuration (no Supabase calls).
 */

export interface DomainConfig {
  domain: string;
  brandName: string;
  vertical: string;
  logoPath: string;
  heroImage: string;
  menuImage: string;
  emailFrom: string; // Display name only, actual email uses dental.bio
  supportEmail: string; // Display name only, actual email uses dental.bio
  contactEmail: string; // For UI display, actual emails use dental.bio
  baseUrl: string;
  tagline?: string;
  gaTrackingId?: string;
  positions: string[];
}

// Email configuration - all emails sent from dental.bio
export const EMAIL_CONFIG = {
  from: 'noreply@dental.bio',
  support: 'support@dental.bio',
  contact: 'hello@dental.bio',
} as const;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Default biocloud configuration (fallback)
const DEFAULT_BIOCLOUD_CONFIG: DomainConfig = {
  domain: 'dental.bio',
  brandName: 'Dentalbio',
  vertical: 'dental',
  logoPath: '/logos/dentalbio.svg',
  heroImage: `${supabaseUrl}/storage/v1/object/public/assets/hero_image/Dental.webp`,
  menuImage: `${supabaseUrl}/storage/v1/object/public/assets/menu/Dental.webp`,
  emailFrom: 'Biocloud',
  supportEmail: 'Support',
  contactEmail: 'hello@dental.bio',
  baseUrl: 'https://dental.bio',
  tagline: 'Your professional dental identity.',
  positions: [
    "Dentist",
    "Principal Dentist",
    "Associate Dentist",
    "Orthodontist",
    "Periodontist",
    "Endodontist",
    "Prosthodontist",
    "Paediatric Dentist",
    "Oral Surgeon",
    "Oral and Maxillofacial Surgeon",
    "Dental Hygienist",
    "Dental Therapist",
    "Dental Nurse",
    "Dental Technician",
    "Treatment Coordinator (TCO)",
    "Practice Manager",
    "Receptionist",
    "Founder / Owner",
    "Manager",
    "Consultant",
    "Lecturer / Educator",
    "Student",
    "Other",
  ]
}

// Static brand configurations stored in the project
const STATIC_BRANDS: DomainConfig[] = [
  {
    domain: 'coach.bio',
    brandName: 'Coachbio',
    vertical: 'coaching',
    logoPath: '/logos/coachbio.svg',
    emailFrom: 'Biocloud',
    heroImage: `${supabaseUrl}/storage/v1/object/public/assets/hero_image/Coach.webp`,
    menuImage: `${supabaseUrl}/storage/v1/object/public/assets/menu/Coach.webp`,
    supportEmail: 'Support',
    contactEmail: 'hello@dental.bio',
    baseUrl: 'https://coach.bio',
    tagline: 'Your professional coach identity.',
    positions: [
      "Coach",
      "Life Coach",
      "Business Coach",
      "Executive Coach",
      "Leadership Coach",
      "Performance Coach",
      "Health Coach",
      "Nutrition Coach",
      "Wellness Coach",
      "Personal Trainer",
      "Strength & Conditioning Coach",
      "Mentor",
      "Consultant",
      "Speaker",
      "Author",
      "Educator / Trainer",
      "Content Creator",
      "Founder / Owner",
      "Freelancer / Self-employed",
      "Student",
      "Other",
    ]
  },
  {
    domain: 'dental.bio',
    brandName: 'Dentalbio',
    vertical: 'dental',
    logoPath: '/logos/dentalbio.svg',
    emailFrom: 'Biocloud',
    heroImage: `${supabaseUrl}/storage/v1/object/public/assets/hero_image/Dental.webp`,
    menuImage: `${supabaseUrl}/storage/v1/object/public/assets/menu/Dental.webp`,
    supportEmail: 'Support',
    contactEmail: 'hello@dental.bio',
    baseUrl: 'https://dental.bio',
    tagline: 'Your professional dental identity.',
    positions: [
      "Dentist",
      "Principal Dentist",
      "Associate Dentist",
      "Orthodontist",
      "Periodontist",
      "Endodontist",
      "Prosthodontist",
      "Paediatric Dentist",
      "Oral Surgeon",
      "Oral and Maxillofacial Surgeon",
      "Dental Hygienist",
      "Dental Therapist",
      "Dental Nurse",
      "Dental Technician",
      "Treatment Coordinator (TCO)",
      "Practice Manager",
      "Receptionist",
      "Founder / Owner",
      "Manager",
      "Consultant",
      "Lecturer / Educator",
      "Student",
      "Other",
    ]
  },
  {
    domain: 'doctors.bio',
    brandName: 'Doctorsbio',
    vertical: 'doctors',
    logoPath: '/logos/doctorsbio.svg',
    emailFrom: 'Biocloud',
    heroImage: `${supabaseUrl}/storage/v1/object/public/assets/hero_image/Doctors.webp`,
    menuImage: `${supabaseUrl}/storage/v1/object/public/assets/menu/Doctors.webp`,
    supportEmail: 'Support',
    contactEmail: 'hello@dental.bio',
    baseUrl: 'https://doctors.bio',
    tagline: 'Your professional doctor identity.',
    positions: [
      "Doctor / Physician",
      "Dentist",
      "Nurse",
      "Pharmacist",
      "Prescriber",
      "Aesthetic Practitioner",
      "Cosmetic Injector",
      "Medical Aesthetics Specialist",
      "Consultant",
      "Associate",
      "Locum",
      "Clinical Lead",
      "Founder / Owner",
      "Clinic Manager",
      "Educator / Trainer",
      "Student / Trainee",
      "Other",
    ]
  },
  {
    domain: 'injector.bio',
    brandName: 'Injectorbio',
    vertical: 'injector',
    logoPath: '/logos/injectorbio.svg',
    emailFrom: 'Biocloud',
    heroImage: `${supabaseUrl}/storage/v1/object/public/assets/hero_image/Injector.webp`,
    menuImage: `${supabaseUrl}/storage/v1/object/public/assets/menu/Injector.webp`,
    supportEmail: 'Support',
    contactEmail: 'hello@dental.bio',
    baseUrl: 'https://injector.bio',
    tagline: 'Your professional injector identity.',
    positions: [
      "Doctor / Physician",
      "Dentist",
      "Nurse",
      "Pharmacist",
      "Prescriber",
      "Aesthetic Practitioner",
      "Cosmetic Injector",
      "Medical Aesthetics Specialist",
      "Consultant",
      "Associate",
      "Locum",
      "Clinical Lead",
      "Founder / Owner",
      "Clinic Manager",
      "Educator / Trainer",
      "Student / Trainee",
      "Other",
    ]
  },
  {
    domain: 'pharmacists.bio',
    brandName: 'Pharmacistsbio',
    vertical: 'pharmacists',
    logoPath: '/logos/pharmacistsbio.svg',
    emailFrom: 'Biocloud',
    heroImage: `${supabaseUrl}/storage/v1/object/public/assets/hero_image/Pharmacists.webp`,
    menuImage: `${supabaseUrl}/storage/v1/object/public/assets/menu/Pharmacists.webp`,
    supportEmail: 'Support',
    contactEmail: 'hello@dental.bio',
    baseUrl: 'https://pharmacists.bio',
    tagline: 'Your professional pharmacist identity.',
    positions: [
      "Pharmacist",
      "Prescribing Pharmacist",
      "Clinical Pharmacist",
      "Community Pharmacist",
      "Hospital Pharmacist",
      "Pharmacy Technician",
      "Pharmacy Assistant",
      "Pharmacy Manager",
      "Superintendent Pharmacist",
      "Director / Owner",
      "Consultant Pharmacist",
      "Researcher",
      "Educator / Lecturer",
      "Locum Pharmacist",
      "Student",
      "Other",
    ]
  },
  {
    domain: 'podcasts.bio',
    brandName: 'Podcastsbio',
    vertical: 'podcasts',
    logoPath: '/logos/podcastsbio.svg',
    emailFrom: 'Biocloud',
    heroImage: `${supabaseUrl}/storage/v1/object/public/assets/hero_image/Podcasts.webp`,
    menuImage: `${supabaseUrl}/storage/v1/object/public/assets/menu/Podcasts.webp`,
    supportEmail: 'Support',
    contactEmail: 'hello@dental.bio',
    baseUrl: 'https://podcasts.bio',
    tagline: 'Your professional podcast identity.',
    positions: [
      "Podcast Host",
      "Co-host",
      "Podcast Producer",
      "Podcast Editor",
      "Broadcaster",
      "Journalist",
      "Content Creator",
      "Founder / Owner",
      "Entrepreneur",
      "Marketing / Growth",
      "Community Manager",
      "Guest",
      "Other",
    ]
  },
  {
    domain: 'specialist.bio',
    brandName: 'Specialistbio',
    vertical: 'specialist',
    logoPath: '/logos/specialistbio.svg',
    emailFrom: 'Biocloud',
    heroImage: `${supabaseUrl}/storage/v1/object/public/assets/hero_image/Specialist.webp`,
    menuImage: `${supabaseUrl}/storage/v1/object/public/assets/menu/Specialist.webp`,
    supportEmail: 'Support',
    contactEmail: 'hello@dental.bio',
    baseUrl: 'https://specialist.bio',
    tagline: 'Your professional specialist identity.',
    positions: [
      "Dental and Maxillofacial Radiologist",
      "Dental Public Health Specialist",
      "Endodontist",
      "Oral Medicine Specialist",
      "Oral Microbiologist",
      "Oral and Maxillofacial Pathologist",
      "Oral Surgeon",
      "Orthodontist",
      "Paediatric Dentist",
      "Periodontist",
      "Prosthodontist",
      "Restorative Dentist",
      "Special Care Dentist",
      "Allergist / Clinical Immunologist",
      "Anaesthetist",
      "Cardiologist",
      "Cardiothoracic Surgeon",
      "Clinical Geneticist",
      "Clinical Oncologist",
      "Dermatologist",
      "Emergency Medicine Specialist",
      "Endocrinologist",
      "ENT Surgeon (Otolaryngologist)",
      "Gastroenterologist",
      "Geriatrician",
      "Haematologist",
      "Infectious Diseases Specialist",
      "Intensive Care Specialist",
      "Medical Microbiologist",
      "Medical Oncologist",
      "Medical Ophthalmologist",
      "Nephrologist",
      "Neurologist",
      "Neurosurgeon",
      "Nuclear Medicine Specialist",
      "Obstetrician and Gynaecologist",
      "Occupational Medicine Specialist",
      "Ophthalmologist",
      "Orthopaedic Surgeon",
      "Paediatrician",
      "Paediatric Surgeon",
      "Pathologist",
      "Plastic Surgeon",
      "Psychiatrist",
      "Forensic Psychiatrist",
      "Child and Adolescent Psychiatrist",
      "Old Age Psychiatrist",
      "Public Health Specialist",
      "Radiologist (Clinical Radiology)",
      "Rehabilitation Medicine Specialist",
      "Respiratory Physician (Pulmonologist)",
      "Rheumatologist",
      "Sport and Exercise Medicine Specialist",
      "Urologist",
      "Vascular Surgeon",
      "General Surgeon",
      "Other",
    ]
  },
  {
    domain: 'therapists.bio',
    brandName: 'Therapistsbio',
    vertical: 'therapists',
    logoPath: '/logos/therapistsbio.svg',
    emailFrom: 'Biocloud',
    heroImage: `${supabaseUrl}/storage/v1/object/public/assets/hero_image/Therapists.webp`,
    menuImage: `${supabaseUrl}/storage/v1/object/public/assets/menu/Therapists.webp`,
    supportEmail: 'Support',
    contactEmail: 'hello@dental.bio',
    baseUrl: 'https://therapists.bio',
    tagline: 'Your professional therapist identity.',
    positions: [
      "Therapist",
      "Counsellor",
      "Psychotherapist",
      "Psychologist",
      "Psychiatrist",
      "CBT Therapist",
      "Family Therapist",
      "Child Therapist",
      "Physiotherapist",
      "Occupational Therapist",
      "Speech & Language Therapist",
      "Consultant",
      "Clinical Lead",
      "Founder / Owner",
      "Practice Manager",
      "Student / Trainee",
      "Other"
    ]
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

