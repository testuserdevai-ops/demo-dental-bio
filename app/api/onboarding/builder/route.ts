import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getOnboardingBuilderData,
  onboardingBuilderIds,
} from "@/app/onboarding/questions/_lib/builder-data";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";

const querySchema = z.object({
  builder: z.enum(onboardingBuilderIds),
  targetUserId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const input = querySchema.safeParse({
    builder: url.searchParams.get("builder"),
    targetUserId: url.searchParams.get("targetUserId") ?? undefined,
  });
  if (!input.success) {
    return NextResponse.json(
      { error: "This setup editor was not recognized." },
      { status: 400 },
    );
  }

  try {
    const { scope } = await resolveDashboardIdentity(input.data.targetUserId);
    return NextResponse.json(
      await getOnboardingBuilderData(input.data.builder, scope),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "We could not load this setup editor. Try again." },
      { status: 403 },
    );
  }
}
