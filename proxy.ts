import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { isCustomDomainHost } from "@/lib/customDomain";
import { lookupUsernameByDomain } from "@/utils/lookupDomainUser";

type ProxyDependencies = {
  updateSession: typeof updateSession;
  lookupUsernameByDomain: typeof lookupUsernameByDomain;
};

export async function handleProxy(
  request: NextRequest,
  dependencies: ProxyDependencies,
) {
  const rawHost =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";
  const host = rawHost.split(":")[0].toLowerCase();

  // Custom domain handling: if the request arrives on a domain a user connected
  // (i.e. not one of our brand .bio domains / localhost / *.vercel.app), serve
  // that user's public profile from the domain root.
  if (isCustomDomainHost(host)) {
    const { pathname } = request.nextUrl;

    // Infrastructure paths must be served by the app as-is (not rewritten).
    const passthrough =
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/monitoring");

    if (!passthrough) {
      const username = await dependencies.lookupUsernameByDomain(host);
      if (username) {
        const url = request.nextUrl.clone();
        url.pathname = `/${username}${pathname === "/" ? "" : pathname}`;
        return NextResponse.rewrite(url);
      }
      // Unknown custom domain → fall through to normal (marketing) handling.
    }
  }

  // Default behaviour: Supabase session refresh + auth guards.
  const response = await dependencies.updateSession(request);

  // If x-forwarded-host is missing, set it from the host header for downstream use.
  const reqHost = request.headers.get("host");
  const xForwardedHost = request.headers.get("x-forwarded-host");
  if (reqHost && !xForwardedHost) {
    response.headers.set("x-forwarded-host", reqHost);
  }

  return response;
}

export async function proxy(request: NextRequest) {
  return handleProxy(request, { updateSession, lookupUsernameByDomain });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
