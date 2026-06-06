/**
 * Custom domain helpers shared between middleware, API routes and the dashboard.
 * Pure functions only — safe to import in the edge runtime.
 */

import { getAllDomains } from "@/utils/domainConfig";

// IP that Vercel apex (A record) domains should point to.
export const VERCEL_A_RECORD_IP = "76.76.21.21";
// Target that Vercel subdomain (CNAME) records should point to.
export const VERCEL_CNAME_TARGET = "cname.vercel-dns.com";

/**
 * Hosts that are "ours" and must never be treated as a user's custom domain:
 * the brand .bio domains, localhost and Vercel preview/deployment URLs.
 */
export function isKnownPlatformHost(host: string): boolean {
  const hostname = host.split(":")[0].toLowerCase();

  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (hostname.endsWith(".vercel.app")) return true;

  return getAllDomains().some((d) => {
    const brand = d.toLowerCase();
    return hostname === brand || hostname.endsWith(`.${brand}`);
  });
}

/**
 * Returns true when the host should be resolved as a user-supplied custom domain.
 */
export function isCustomDomainHost(host: string | null | undefined): boolean {
  if (!host) return false;
  return !isKnownPlatformHost(host);
}

/**
 * Normalises and validates a domain string entered by a user.
 * Strips protocol, path, port, leading "www." and lowercases.
 * Returns null when the value is not a plausible registrable domain.
 */
export function normalizeDomain(input: string): string | null {
  if (!input) return null;

  let value = input.trim().toLowerCase();
  // Strip protocol and any path/query if the user pasted a full URL.
  value = value.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  // Strip port and trailing dot.
  value = value.split(":")[0].replace(/\.$/, "");
  // Strip a leading "www." — Vercel handles the apex/www pairing.
  value = value.replace(/^www\./, "");

  // Basic hostname validation: labels of a-z0-9 (with hyphens), at least one dot.
  const valid = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(value);
  if (!valid) return null;

  // Disallow claiming one of our own platform domains.
  if (isKnownPlatformHost(value)) return null;

  return value;
}

/**
 * Whether a domain is an apex/root (needs an A record) vs a subdomain (CNAME).
 * Treats two-label domains (example.com) and known multi-part TLDs (example.co.uk)
 * as apex. Anything with an extra label (links.example.com) is a subdomain.
 */
export function isApexDomain(domain: string): boolean {
  const labels = domain.split(".");
  if (labels.length <= 2) return true;
  // Common two-part public suffixes where 3 labels is still apex.
  const twoPartTlds = ["co.uk", "org.uk", "com.au", "co.nz", "com.br", "co.za", "co.in", "ac.uk", "gov.uk"];
  const lastTwo = labels.slice(-2).join(".");
  if (twoPartTlds.includes(lastTwo) && labels.length === 3) return true;
  return false;
}
