"use client";

import { useSyncExternalStore } from "react";
import {
  getDomainConfigByHostname,
  type DomainConfig,
} from "@/utils/domainConfig";
import { useBrandDomainOverride } from "@/app/contexts/BrandDomainContext";

const subscribeToHostname = () => () => {};
const getServerHostname = () => "dental.bio";
const getClientHostname = () =>
  typeof window === "undefined"
    ? getServerHostname()
    : window.location.hostname || getServerHostname();

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
  const hostname = useSyncExternalStore(
    subscribeToHostname,
    getClientHostname,
    getServerHostname,
  );

  return getDomainConfigByHostname(brandDomainOverride ?? hostname);
}
