"use client";

import React, { createContext, useContext } from "react";

/**
 * Holds a brand-domain override resolved on the server.
 *
 * On a user's connected custom domain the browser hostname (e.g. drsmith.com)
 * doesn't match any brand, so client components can't derive branding from
 * window.location. The public profile layout resolves the user's
 * `registered_domain` server-side and passes it here; `useDomainConfig` then
 * prefers this value. It is `null` on normal brand domains, where the hook
 * falls back to window.location.hostname (unchanged behaviour).
 */
const BrandDomainContext = createContext<string | null>(null);

export function BrandDomainProvider({
  brandDomain,
  children,
}: {
  brandDomain: string | null;
  children: React.ReactNode;
}) {
  return (
    <BrandDomainContext.Provider value={brandDomain}>
      {children}
    </BrandDomainContext.Provider>
  );
}

export function useBrandDomainOverride(): string | null {
  return useContext(BrandDomainContext);
}
