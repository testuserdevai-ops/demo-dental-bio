'use client';

import { useEffect, useState } from 'react';
import { getDomainConfigByHostname, type DomainConfig } from '@/utils/domainConfig';
import { useBrandDomainOverride } from '@/app/contexts/BrandDomainContext';

/**
 * Client-side hook to get domain configuration.
 *
 * Resolution order:
 *  1. A server-resolved brand-domain override (set on custom domains via
 *     BrandDomainProvider) — so a user's connected domain shows the branding of
 *     the brand they registered under.
 *  2. Otherwise window.location.hostname (brand domains, dashboard, etc.).
 */
export function useDomainConfig(): DomainConfig {
  const brandDomainOverride = useBrandDomainOverride();

  const [config, setConfig] = useState<DomainConfig>(() => {
    // When the server provided an override, derive the config immediately so
    // there is no flash of default branding (the function is SSR-safe).
    if (brandDomainOverride) {
      return getDomainConfigByHostname(brandDomainOverride);
    }
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
    if (brandDomainOverride) {
      setConfig(getDomainConfigByHostname(brandDomainOverride));
      return;
    }
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname || 'dental.bio';
      setConfig(getDomainConfigByHostname(hostname));
    }
  }, [brandDomainOverride]);

  return config;
}
