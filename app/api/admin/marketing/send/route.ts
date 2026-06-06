import { withAuth } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';
import supabaseAdmin from '@/utils/supabase/supabaseAdmin';
import { getDomainConfigByHostname } from '@/utils/domainConfig';
import { sendMarketingEmail, type MarketingRecipient } from '@/utils/mails/sendMarketingEmail';
import { normalizeEmail } from '@/utils/marketing/unsubscribeToken';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST = withAuth(async (request, { user }) => {
  if (user.role !== 'admin') {
    return apiResponse.forbidden();
  }

  const body = await request.json().catch(() => null);
  if (!body) return apiResponse.badRequest('Invalid JSON body');

  const { subject, bodyHtml, brandDomain, recipients } = body as {
    subject?: string;
    bodyHtml?: string;
    brandDomain?: string;
    recipients?: { email?: string; firstName?: string }[];
  };

  if (!subject?.trim()) return apiResponse.badRequest('Subject is required');
  if (!bodyHtml?.trim()) return apiResponse.badRequest('Email content is required');
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return apiResponse.badRequest('At least one recipient is required');
  }

  const config = getDomainConfigByHostname(brandDomain || 'dental.bio');

  // Validate + dedupe by normalized email.
  const byEmail = new Map<string, MarketingRecipient>();
  let invalid = 0;
  for (const r of recipients) {
    const email = normalizeEmail(r.email || '');
    if (!EMAIL_RE.test(email)) {
      invalid++;
      continue;
    }
    if (!byEmail.has(email)) {
      byEmail.set(email, { email, firstName: r.firstName?.trim() || undefined });
    }
  }

  const unique = Array.from(byEmail.values());
  if (unique.length === 0) {
    return apiResponse.badRequest('No valid email addresses found in the list');
  }

  // Remove anyone on the suppression list. Query in chunks to stay within
  // PostgREST's .in() limits.
  const suppressed = new Set<string>();
  const emails = unique.map((r) => r.email);
  for (let i = 0; i < emails.length; i += 200) {
    const chunk = emails.slice(i, i + 200);
    const { data, error } = await supabaseAdmin
      .from('marketing_unsubscribes')
      .select('email')
      .in('email', chunk);
    if (error) return apiResponse.error(error.message, 500);
    data?.forEach((row: { email: string }) => suppressed.add(normalizeEmail(row.email)));
  }

  const toSend = unique.filter((r) => !suppressed.has(r.email));
  if (toSend.length === 0) {
    return apiResponse.success({
      sent: 0,
      failed: 0,
      suppressed: suppressed.size,
      invalid,
      total: recipients.length,
      message: 'Everyone on this list has already unsubscribed.',
    });
  }

  const result = await sendMarketingEmail({
    subject: subject.trim(),
    bodyHtml,
    config,
    recipients: toSend,
  });

  return apiResponse.success({
    sent: result.sent,
    failed: result.failed,
    suppressed: suppressed.size,
    invalid,
    total: recipients.length,
    errors: result.errors.slice(0, 5),
  });
});
