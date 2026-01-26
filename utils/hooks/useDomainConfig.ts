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
      domain: '',
      brandName: '',
      vertical: '',
      logoPath: '',
      emailFrom: '',
      heroImage: '',
      menuImage: '',
      supportEmail: 'Support',
      contactEmail: 'hello@dental.bio',
      baseUrl: '',
      tagline: 'Your professional identity, simplified.',
      positions: []
    };
  });

  useEffect(() => {
    // Get config from static configuration when component mounts (client-side only)
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname || 'dental.bio';
      const config = getDomainConfigByHostname(hostname);
      setConfig(config);
    }
  }, []);

  return config;
}