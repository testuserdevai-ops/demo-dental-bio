/**
 * Server-only wrapper around the Vercel REST API for managing project domains.
 *
 * SECURITY: VERCEL_API_KEY grants full account access. It must never be exposed
 * to the browser (do NOT prefix with NEXT_PUBLIC_). Only import this module from
 * server code (route handlers, server components, middleware).
 */

const API_BASE = "https://api.vercel.com";

const VERCEL_API_KEY = process.env.VERCEL_API_KEY;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

export interface VercelDomainResponse {
  name: string;
  apexName?: string;
  verified: boolean;
  // Present when the domain still needs domain-level (not DNS) verification.
  verification?: Array<{ type: string; domain: string; value: string; reason: string }>;
  error?: { code: string; message: string };
}

export interface VercelDomainConfig {
  // Vercel reports misconfigured=true until DNS points at Vercel correctly.
  misconfigured: boolean;
  configuredBy?: string | null;
  acceptedChallenges?: string[];
  error?: { code: string; message: string };
}

function assertConfigured() {
  if (!VERCEL_API_KEY || !VERCEL_PROJECT_ID) {
    throw new Error(
      "Vercel is not configured. Set VERCEL_API_KEY and VERCEL_PROJECT_ID in the environment."
    );
  }
}

function withTeam(path: string): string {
  if (!VERCEL_TEAM_ID) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}teamId=${VERCEL_TEAM_ID}`;
}

async function vercelFetch<T>(path: string, init?: RequestInit): Promise<T> {
  assertConfigured();
  const res = await fetch(`${API_BASE}${withTeam(path)}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${VERCEL_API_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as T & { error?: { message: string } };

  // Vercel returns a 409 for "domain already added to this project" which we treat
  // as success at the call sites; surface other errors via the returned payload.
  return data as T;
}

/**
 * Add a domain to the Vercel project. Idempotent-ish: if the domain already
 * belongs to this project Vercel returns the existing record.
 */
export function addDomainToProject(domain: string): Promise<VercelDomainResponse> {
  return vercelFetch<VercelDomainResponse>(
    `/v10/projects/${VERCEL_PROJECT_ID}/domains`,
    { method: "POST", body: JSON.stringify({ name: domain }) }
  );
}

/** Remove a domain from the Vercel project. */
export function removeDomainFromProject(domain: string): Promise<{ error?: { message: string } }> {
  return vercelFetch(
    `/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`,
    { method: "DELETE" }
  );
}

/** Read the DNS configuration status for a domain (misconfigured until DNS is set). */
export function getDomainConfig(domain: string): Promise<VercelDomainConfig> {
  return vercelFetch<VercelDomainConfig>(
    `/v6/domains/${domain}/config`
  );
}

/** Read the project-domain record (includes domain-level verification challenges). */
export function getProjectDomain(domain: string): Promise<VercelDomainResponse> {
  return vercelFetch<VercelDomainResponse>(
    `/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`
  );
}

/** Trigger Vercel's domain-level verification (TXT challenge) if required. */
export function verifyProjectDomain(domain: string): Promise<VercelDomainResponse> {
  return vercelFetch<VercelDomainResponse>(
    `/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}/verify`,
    { method: "POST" }
  );
}
