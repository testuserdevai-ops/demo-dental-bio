import { NextResponse } from "next/server";
import { setDentalBrandAuthority } from "@/lib/dashboard/authority-write";
import { sendPlanChangeEmail } from "@/utils/mails/sendTemplateEmails";
import { capitalize } from "@/utils/functions/functions";
import { getDomainConfigByHostname } from "@/utils/domainConfig";
import { z } from "zod";

export const dynamic = "force-dynamic";

const subscriptionStatusSchema = z.enum(["FREE", "PRO", "PREMIUM PRO"]);
const billingCycleSchema = z.enum(["monthly", "annually"]);
const userChangeWebhookSchema = z
  .object({
    record: z
      .object({
        id: z.string().uuid(),
        email: z.string().email(),
        registered_domain: z.string().min(1),
        subscription_status: subscriptionStatusSchema,
        billing_cycle: billingCycleSchema,
        use_dental_brand: z.boolean(),
      })
      .passthrough(),
    old_record: z
      .object({
        subscription_status: subscriptionStatusSchema,
        billing_cycle: billingCycleSchema,
      })
      .passthrough(),
  })
  .passthrough();

export const POST = async (request: Request) => {
  try {
    // Verify the request is from a legitimate cron service
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = userChangeWebhookSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const currentRecord = parsed.data.record;
    const oldRecord = parsed.data.old_record;

    const domainConfig = getDomainConfigByHostname(
      currentRecord.registered_domain,
    );

    if (
      currentRecord.subscription_status !== "PREMIUM PRO" &&
      currentRecord.use_dental_brand === false
    ) {
      await setDentalBrandAuthority(currentRecord.id, true);
    }

    if (
      currentRecord.subscription_status !== oldRecord.subscription_status ||
      currentRecord.billing_cycle !== oldRecord.billing_cycle
    ) {
      await sendPlanChangeEmail(
        currentRecord.email,
        oldRecord.subscription_status,
        capitalize(oldRecord.billing_cycle),
        currentRecord.subscription_status,
        capitalize(currentRecord.billing_cycle),
        domainConfig,
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error in trial expiration cron job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};
