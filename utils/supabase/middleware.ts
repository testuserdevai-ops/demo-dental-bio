import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { hasAdminCapability } from "@/lib/admin/policy";

type SessionCookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

function isAdminRoute(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isSecurityAdminRoute(pathname: string) {
  return (
    pathname === "/admin/security" || pathname.startsWith("/admin/security/")
  );
}

export async function updateSession(
  request: NextRequest,
  requestHeaders: Headers = request.headers,
) {
  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });
  let sessionResponseHeaders: Record<string, string> = {};

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: SessionCookie[],
          responseHeaders: Record<string, string>,
        ) {
          // Recreate the response so Next can apply the updated cookies
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          sessionResponseHeaders = { ...responseHeaders };

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });

          Object.entries(responseHeaders).forEach(([name, value]) => {
            supabaseResponse.headers.set(name, value);
          });
        },
      },
    },
  );

  const { data: claimsData } = await supabase.auth.getClaims();
  const authenticatedUserId = claimsData?.claims.sub ?? null;

  const redirectWithSession = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;

    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie);
    });
    Object.entries(sessionResponseHeaders).forEach(([name, value]) => {
      response.headers.set(name, value);
    });

    return response;
  };

  if (
    !authenticatedUserId &&
    (request.nextUrl.pathname.startsWith("/dashboard") ||
      isAdminRoute(request.nextUrl.pathname))
  ) {
    return redirectWithSession("/login");
  }

  // Block non-admin users from accessing /admin routes
  if (authenticatedUserId && isAdminRoute(request.nextUrl.pathname)) {
    const { data: userData } = await supabase
      .from("users")
      .select("role, is_blocked")
      .eq("id", authenticatedUserId)
      .single();

    const capability = isSecurityAdminRoute(request.nextUrl.pathname)
      ? "console:security"
      : "console:admin";
    if (
      !userData ||
      !hasAdminCapability(
        { role: userData.role, isBlocked: userData.is_blocked },
        capability,
      )
    ) {
      return redirectWithSession("/dashboard");
    }
  }

  return supabaseResponse;
}
