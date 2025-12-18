'use client';

import { useEffect, useState } from 'react';
import { getDomainConfigByHostname, type DomainConfig } from '@/utils/domainConfig';

/**
 * Client-side hook to get domain configuration
 * Uses window.location.hostname to detect the current domain
 * Fetches from Supabase database with caching
 */
export function useDomainConfig(): DomainConfig {
  const [config, setConfig] = useState<DomainConfig>(() => {
    // Initialize with default biocloud config (SSR-safe)
    return {
      domain: 'biocloud.com',
      brandName: 'Biocloud',
      logoPath: '/logo.svg',
      emailFrom: 'Biocloud',
      supportEmail: 'Support',
      contactEmail: 'hello@biocloud.com',
      baseUrl: 'https://biocloud.com',
      tagline: 'Your professional identity, simplified.',
    };
  });

  useEffect(() => {
    // Fetch config from database when component mounts (client-side only)
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      getDomainConfigByHostname(hostname).then(setConfig);
    }
  }, []);

  return config;
}

