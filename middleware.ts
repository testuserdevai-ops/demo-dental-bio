import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Ensure x-forwarded-host header is available for domain configuration
  // Note: getCurrentHostname() checks 'host' header first, then 'x-forwarded-host'
  // If x-forwarded-host is not set by the proxy, the 'host' header will be used.
  // We set it in the response for consistency and any downstream use.
  
  const response = await updateSession(request);
  
  // If x-forwarded-host is missing, set it from the host header
  const host = request.headers.get('host');
  const xForwardedHost = request.headers.get('x-forwarded-host');
  
  if (host && !xForwardedHost) {
    response.headers.set('x-forwarded-host', host);
  }
  
  return response;
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
