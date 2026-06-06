import crypto from 'crypto';

/**
 * Stateless, signed unsubscribe tokens.
 *
 * The token encodes the recipient's email and is signed with an HMAC so the
 * public unsubscribe endpoint can trust it without us having to pre-store a
 * token for every CSV-imported contact. Format: `<base64url(email)>.<sig>`.
 *
 * Reuses an existing server secret so no new env var is required, but you can
 * set MARKETING_UNSUBSCRIBE_SECRET to rotate it independently.
 */
const secret =
  process.env.MARKETING_UNSUBSCRIBE_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.CRON_SECRET_KEY ||
  '';

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sign(payload: string): string {
  return base64url(crypto.createHmac('sha256', secret).update(payload).digest());
}

export function generateUnsubscribeToken(email: string): string {
  const payload = base64url(normalizeEmail(email));
  return `${payload}.${sign(payload)}`;
}

/**
 * Verify a token and return the email it was issued for, or null if invalid.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  if (!token || !secret) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;

  const expected = sign(payload);
  // timingSafeEqual throws on length mismatch, so guard first.
  if (expected.length !== sig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;

  try {
    return normalizeEmail(fromBase64url(payload).toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * Absolute URL Gmail/Apple Mail POST to for one-click unsubscribe, and that
 * the visible footer link points at. `baseUrl` should be the brand's base URL.
 */
export function buildUnsubscribeUrl(baseUrl: string, email: string): string {
  const token = generateUnsubscribeToken(email);
  return `${baseUrl.replace(/\/$/, '')}/api/marketing/unsubscribe?token=${encodeURIComponent(token)}`;
}
