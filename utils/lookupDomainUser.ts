/**
 * Resolves a custom domain (host header) to the owning user's username.
 * Used by the middleware to rewrite custom-domain requests to /{username}.
 *
 * Runs in the edge runtime, so it uses a plain REST fetch against Supabase
 * (PostgREST) rather than the supabase-js client, plus a small in-memory cache
 * to avoid a DB round-trip on every request.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const CACHE_TTL_MS = 60_000;

type CacheEntry = { username: string | null; expires: number };
const cache = new Map<string, CacheEntry>();

export async function lookupUsernameByDomain(host: string): Promise<string | null> {
  const domain = host.split(":")[0].toLowerCase();
  if (!domain || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const cached = cache.get(domain);
  const now = Date.now();
  if (cached && cached.expires > now) {
    return cached.username;
  }

  try {
    const url =
      `${SUPABASE_URL}/rest/v1/users` +
      `?domain=eq.${encodeURIComponent(domain)}&select=username&limit=1`;

    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const rows = (await res.json()) as Array<{ username: string }>;
    const username = rows?.[0]?.username ?? null;

    cache.set(domain, { username, expires: now + CACHE_TTL_MS });
    return username;
  } catch {
    return null;
  }
}
