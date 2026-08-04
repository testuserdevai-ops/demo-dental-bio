"use server";
import { EMAIL_CONFIG, type DomainConfig } from "@/utils/domainConfig";
import { buildUnsubscribeUrl } from "@/utils/marketing/unsubscribeToken";
import { getResendClient } from "./resendClient";

// Resend batch endpoint accepts up to 100 messages per call.
const BATCH_SIZE = 100;

export interface MarketingRecipient {
  email: string;
  firstName?: string;
}

export interface SendMarketingResult {
  sent: number;
  failed: number;
  errors: string[];
}

/**
 * Wrap campaign body HTML in the branded shell, including a clear, compliant
 * unsubscribe footer with a per-recipient link.
 */
function renderMarketingHtml(params: {
  subject: string;
  bodyHtml: string;
  config: DomainConfig;
  firstName?: string;
  unsubscribeUrl: string;
}): string {
  const { subject, bodyHtml, config, firstName, unsubscribeUrl } = params;
  const logoUrl = `https://cxqkuqtwrtgvoorxidvn.supabase.co/storage/v1/object/public/assets/${config.brandName}.jpg`;
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";

  // Resolve brand placeholders so the same campaign body works for any brand.
  const resolvedBody = bodyHtml
    .replace(/\{\{\s*baseUrl\s*\}\}/g, config.baseUrl.replace(/\/$/, ""))
    .replace(/\{\{\s*brandName\s*\}\}/g, config.brandName);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="background-color:#5046db;margin:0;padding:40px 0;width:100%;font-family:Arial,sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#5046db;width:100%;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table cellspacing="0" cellpadding="0" border="0" style="padding:48px;background-color:#fefefe;border-radius:32px;max-width:600px;width:100%;box-shadow:0 5px 15px rgba(0,0,0,0.1);margin:0 auto;table-layout:fixed;">
          <tr>
            <td style="padding-bottom:32px;">
              <a href="${config.baseUrl}/login" style="text-decoration:none;">
                <img src="${logoUrl}" alt="${config.brandName} Logo" width="150" style="display:block;border:0;height:auto;" />
              </a>
            </td>
          </tr>
          <tr>
            <td>
              <p style="font-size:16px;color:#1c1c21;line-height:1.7;margin:0 0 20px 0;">${greeting}</p>
              ${resolvedBody}
            </td>
          </tr>
          <tr>
            <td>
              <p style="font-size:16px;color:#888888;margin-top:30px;">
                <a href="${config.baseUrl}/login" style="text-decoration:none;">
                  <span style="color:#5046db;font-weight:bold;line-height:1.7;">${config.brandName}</span>
                </a>
                <br />
                <span style="color:#fd8516;line-height:1.7;font-weight:300;">${config.tagline || `Your ${config.vertical} identity, simplified.`}</span>
              </p>
              <p style="color:#1c1c21;opacity:0.4;font-size:12px;margin-top:24px;line-height:1.7;">
                Biocloud Ltd, 113 Crawford Street, London, W1H 2JG
              </p>
              <p style="color:#888888;font-size:12px;margin-top:8px;line-height:1.7;">
                Don't want these emails?
                <a href="${unsubscribeUrl}" style="color:#5046db;text-decoration:underline;">Unsubscribe</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send a marketing campaign to a list of recipients, batched, with the
 * List-Unsubscribe / List-Unsubscribe-Post headers that make Gmail and Apple
 * Mail render their native one-click unsubscribe button (RFC 8058 + RFC 2369).
 *
 * Callers are responsible for filtering out already-unsubscribed addresses.
 */
export async function sendMarketingEmail(params: {
  subject: string;
  bodyHtml: string;
  config: DomainConfig;
  recipients: MarketingRecipient[];
}): Promise<SendMarketingResult> {
  const { subject, bodyHtml, config, recipients } = params;
  const result: SendMarketingResult = { sent: 0, failed: 0, errors: [] };

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    const messages = batch.map((r) => {
      const unsubscribeUrl = buildUnsubscribeUrl(config.baseUrl, r.email);
      return {
        from: `${config.brandName} <${EMAIL_CONFIG.from}>`,
        to: r.email,
        subject,
        html: renderMarketingHtml({
          subject,
          bodyHtml,
          config,
          firstName: r.firstName,
          unsubscribeUrl,
        }),
        headers: {
          // mailto + one-click https; mailto is a fallback for clients that
          // don't support one-click POST.
          "List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:${EMAIL_CONFIG.support}?subject=unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      };
    });

    try {
      const { data, error } = await getResendClient().batch.send(messages);
      if (error) {
        result.failed += batch.length;
        result.errors.push(error.message || "Batch send error");
      } else {
        result.sent += data?.data?.length ?? batch.length;
      }
    } catch (e) {
      result.failed += batch.length;
      result.errors.push(
        e instanceof Error ? e.message : "Unknown batch error",
      );
    }
  }

  return result;
}
