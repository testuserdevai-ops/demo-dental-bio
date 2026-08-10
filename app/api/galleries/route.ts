import { NextResponse } from "next/server";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { getGalleryAggregate } from "@/app/dashboard/gallery/_lib/queries";

export async function GET(request: Request) {
  try {
    const hint =
      new URL(request.url).searchParams.get("targetUserId") ?? undefined;
    const { scope } = await resolveDashboardIdentity(hint);
    return NextResponse.json(await getGalleryAggregate(scope));
  } catch {
    return NextResponse.json(
      { error: "Unable to load galleries" },
      { status: 403 },
    );
  }
}
