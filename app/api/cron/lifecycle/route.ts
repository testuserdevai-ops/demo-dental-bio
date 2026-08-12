import { NextResponse } from "next/server";

import { deliverLifecycleMessages } from "@/lib/lifecycle/delivery";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const configuredSecret = process.env.CRON_SECRET_KEY;
  if (
    !configuredSecret ||
    request.headers.get("authorization") !== `Bearer ${configuredSecret}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await deliverLifecycleMessages({});
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Lifecycle delivery failed" },
      { status: 500 },
    );
  }
}
