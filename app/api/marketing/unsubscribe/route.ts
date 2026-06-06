import { NextResponse } from 'next/server';
import supabaseAdmin from '@/utils/supabase/supabaseAdmin';
import { verifyUnsubscribeToken } from '@/utils/marketing/unsubscribeToken';

export const dynamic = 'force-dynamic';

/**
 * Public marketing unsubscribe endpoint (no auth).
 *
 * - POST: Gmail/Apple Mail "one-click" unsubscribe (RFC 8058). The mail client
 *   sends a POST with body `List-Unsubscribe=One-Click`; we only need the token
 *   from the query string. Must return 2xx with no body.
 * - GET:  the visible "Unsubscribe" link in the email footer. Records the opt-out
 *   and renders a friendly confirmation page.
 */

async function recordUnsubscribe(token: string | null, source: string): Promise<string | null> {
  const email = token ? verifyUnsubscribeToken(token) : null;
  if (!email) return null;

  // upsert so repeat clicks are idempotent.
  await supabaseAdmin
    .from('marketing_unsubscribes')
    .upsert({ email, source }, { onConflict: 'email' });

  return email;
}

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  await recordUnsubscribe(token, 'one-click');
  // RFC 8058: a 2xx response signals success regardless of token validity,
  // so mail clients don't show an error to the user.
  return new NextResponse(null, { status: 200 });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  const email = await recordUnsubscribe(token, 'link');

  const ok = Boolean(email);
  const message = ok
    ? `You've been unsubscribed${email ? ` (${escapeHtml(email)})` : ''}. You won't receive any more marketing emails from us.`
    : 'This unsubscribe link is invalid or has expired. Please contact support@dental.bio and we\'ll remove you.';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unsubscribe</title>
</head>
<body style="margin:0;font-family:Arial,sans-serif;background-color:#5046db;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
  <div style="background:#fefefe;border-radius:32px;max-width:480px;width:100%;padding:48px;box-shadow:0 5px 15px rgba(0,0,0,0.1);text-align:center;">
    <div style="font-size:40px;margin-bottom:16px;">${ok ? '✅' : '⚠️'}</div>
    <h1 style="font-size:24px;color:#1c1c21;margin:0 0 16px 0;">${ok ? 'Unsubscribed' : 'Something went wrong'}</h1>
    <p style="font-size:16px;color:#1c1c21;line-height:1.6;margin:0;">${message}</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
