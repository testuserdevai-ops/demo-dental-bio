import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type SessionCookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

function isAdminRoute(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    !user &&
    (request.nextUrl.pathname.startsWith("/dashboard") ||
      isAdminRoute(request.nextUrl.pathname))
  ) {
    return redirectWithSession("/login");
  }

  // Block non-admin users from accessing /admin routes
  if (user && isAdminRoute(request.nextUrl.pathname)) {
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || userData.role !== "admin") {
      return redirectWithSession("/dashboard");
    }
  }

  return supabaseResponse;
}
