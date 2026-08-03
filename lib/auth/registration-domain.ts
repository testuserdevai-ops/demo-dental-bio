import "server-only";

import {
  getAllDomains,
  getDomainConfigByHostname,
  type DomainConfig,
} from "@/utils/domainConfig";

function requestHostname(request: Request): string | null {
  try {
    return new URL(request.url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isLoopback(hostname: string) {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
  );
}

export function resolveRegistrationDomain(
  request: Request,
  selectedDomain: string,
): DomainConfig | null {
  const hostname = requestHostname(request);
  const configuredDomains = getAllDomains();
  if (!hostname || !configuredDomains.includes(selectedDomain)) return null;

  if (isLoopback(hostname)) {
    return getDomainConfigByHostname(selectedDomain);
  }
  if (hostname !== selectedDomain || !configuredDomains.includes(hostname)) {
    return null;
  }
  return getDomainConfigByHostname(hostname);
}
