import { NextResponse } from "next/server";
import { sendVerificationMail } from "@/utils/mails/sendVerificationMail";
import { getDomainConfig } from "@/utils/domainConfig";
import { headers } from "next/headers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const verificationChangedWebhookSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email().max(320),
    username: z
      .string()
      .min(3)
      .max(30)
      .regex(/^[a-z0-9._-]+$/),
    first_name: z
      .string()
      .min(1)
      .max(50)
      .regex(/^[\p{L}\p{M}\s'-]+$/u),
    isVerified: z.literal(true),
    timestamp: z.string().datetime({ offset: true }),
  })
  .strict();

export const POST = async (request: Request) => {
  try {
    // Verify the request is from a legitimate cron service
    const configuredSecret = process.env.CRON_SECRET_KEY;
    const authHeader = request.headers.get("authorization");
    if (
      !configuredSecret ||
      configuredSecret.trim() === "" ||
      authHeader !== `Bearer ${configuredSecret}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = verificationChangedWebhookSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { email, username, first_name } = parsed.data;
    const headersList = await headers();
    const domainConfig = getDomainConfig(headersList);
    await sendVerificationMail(email, username, first_name, domainConfig);

    return NextResponse.json({
      success: true,
    });
  } catch {
    console.error("Verification webhook delivery failed");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};
