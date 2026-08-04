import { NextResponse } from "next/server";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { getTreatmentAggregate } from "@/app/dashboard/treatments/_lib/queries";

export async function GET(request: Request) {
  try {
    const targetUserId = new URL(request.url).searchParams.get("targetUserId");
    const { scope } = await resolveDashboardIdentity(targetUserId);
    return NextResponse.json(await getTreatmentAggregate(scope));
  } catch {
    return NextResponse.json(
      { error: "Unable to load treatments" },
      { status: 403 },
    );
  }
}
