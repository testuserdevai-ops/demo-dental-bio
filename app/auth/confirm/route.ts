import { type NextRequest, NextResponse } from "next/server";

import { safeInternalPath } from "@/lib/auth/redirects";
import { createClient } from "@/app/auth/confirm/server-dependencies";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeInternalPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
