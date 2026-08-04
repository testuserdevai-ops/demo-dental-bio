import { NextResponse } from "next/server";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { getProfileViewModel } from "@/app/dashboard/_lib/profile/queries";

export async function GET(request: Request) {
  try {
    const target = new URL(request.url).searchParams.get("targetUserId");
    const { scope } = await resolveDashboardIdentity(target);
    return NextResponse.json(await getProfileViewModel(scope));
  } catch {
    return NextResponse.json(
      { error: "Unable to load profile" },
      { status: 403 },
    );
  }
}
