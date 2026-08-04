import { NextResponse } from "next/server";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { getBlogAggregate } from "@/app/dashboard/blog/_lib/queries";

export async function GET(request: Request) {
  try {
    const hint =
      new URL(request.url).searchParams.get("targetUserId") ?? undefined;
    const { scope } = await resolveDashboardIdentity(hint);
    return NextResponse.json(await getBlogAggregate(scope));
  } catch {
    return NextResponse.json(
      { error: "Unable to load blogs" },
      { status: 403 },
    );
  }
}
