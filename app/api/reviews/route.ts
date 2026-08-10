import { NextResponse } from "next/server";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { getReviewAggregate } from "@/app/dashboard/review/_lib/queries";

export async function GET(request: Request) {
  try {
    const hint =
      new URL(request.url).searchParams.get("targetUserId") ?? undefined;
    const { scope } = await resolveDashboardIdentity(hint);
    return NextResponse.json(await getReviewAggregate(scope));
  } catch {
    return NextResponse.json(
      { error: "Unable to load reviews" },
      { status: 403 },
    );
  }
}
