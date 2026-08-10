import { withAdminAuthorization } from "@/lib/admin/http";
import { listSuppressedMarketingEmails } from "@/lib/admin/marketing-repository";
import { apiResponse } from "@/lib/apiResponse";
import { getAllBrands, getDomainConfigByHostname } from "@/utils/domainConfig";
import {
  sendMarketingEmail,
  type MarketingRecipient,
} from "@/utils/mails/sendMarketingEmail";
import { normalizeEmail } from "@/utils/marketing/unsubscribeToken";
import { z } from "zod";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const brandDomains = new Set(getAllBrands().map(({ domain }) => domain));
const marketingSendSchema = z
  .object({
    subject: z.string().trim().min(1).max(200),
    bodyHtml: z.string().trim().min(1).max(250_000),
    brandDomain: z.string().trim().max(253).optional(),
    recipients: z
      .array(
        z
          .object({
            email: z.string().trim().max(320),
            firstName: z.string().trim().max(100).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(5_000),
  })
  .strict();

export const POST = withAdminAuthorization(
  "marketing:manage",
  async (request) => {
    const parsed = marketingSendSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) return apiResponse.badRequest("Invalid campaign data");

    const { subject, bodyHtml, brandDomain, recipients } = parsed.data;
    if (brandDomain && !brandDomains.has(brandDomain)) {
      return apiResponse.badRequest("Invalid brand domain");
    }

    const config = getDomainConfigByHostname(brandDomain || "dental.bio");

    // Validate + dedupe by normalized email.
    const byEmail = new Map<string, MarketingRecipient>();
    let invalid = 0;
    for (const r of recipients) {
      const email = normalizeEmail(r.email || "");
      if (!EMAIL_RE.test(email)) {
        invalid++;
        continue;
      }
      if (!byEmail.has(email)) {
        byEmail.set(email, {
          email,
          firstName: r.firstName?.trim() || undefined,
        });
      }
    }

    const unique = Array.from(byEmail.values());
    if (unique.length === 0) {
      return apiResponse.badRequest(
        "No valid email addresses found in the list",
      );
    }

    const suppressed = new Set<string>();
    const emails = unique.map((r) => r.email);
    for (const email of await listSuppressedMarketingEmails(emails)) {
      suppressed.add(normalizeEmail(email));
    }

    const toSend = unique.filter((r) => !suppressed.has(r.email));
    if (toSend.length === 0) {
      return apiResponse.success({
        sent: 0,
        failed: 0,
        suppressed: suppressed.size,
        invalid,
        total: recipients.length,
        message: "Everyone on this list has already unsubscribed.",
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
  },
);
