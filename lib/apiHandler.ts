import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/userInfo";
import { getRequestMeta } from "@/utils/securityLogger";
import { apiResponse } from "./apiResponse";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Forward client IP and user-agent to PostgREST so the profile_audit_log
// trigger can stamp them on each row. PostgREST exposes incoming headers
// via current_setting('request.headers'); see fn_audit_write().
function auditHeaders(request: Request): Record<string, string> {
  const { ip_address, user_agent } = getRequestMeta(request);
  const headers: Record<string, string> = {};
  if (ip_address) headers["x-client-ip"] = ip_address;
  if (user_agent) headers["x-client-ua"] = user_agent;
  return headers;
}

export interface AuthContext {
  supabase: SupabaseClient;
  user: any;
}

export interface OptionalAuthContext {
  supabase: SupabaseClient;
  user: any | null;
}

type AuthHandler = (
  request: Request,
  ctx: AuthContext,
) => Promise<NextResponse>;
type OptionalAuthHandler = (
  request: Request,
  ctx: OptionalAuthContext,
) => Promise<NextResponse>;
type PublicHandler = (
  request: Request,
  ctx: { supabase: SupabaseClient },
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with authentication.
 * Creates supabase client, verifies user is authenticated, and provides both to the handler.
 * Catches all errors and returns a 500 response.
 */
export function withAuth(handler: AuthHandler) {
  return async (request: Request) => {
    try {
      const supabase = await createClient(auditHeaders(request));
      const user = await getUserInfo({ supabase });
      if (!user) return apiResponse.unauthorized();
      return await handler(request, { supabase, user });
    } catch (error) {
      return apiResponse.error((error as Error).message, 500);
    }
  };
}

/**
 * Wraps an API route handler with optional authentication.
 * Creates supabase client, attempts to get user (null if not authenticated).
 * Useful for GET endpoints that show different data for admin vs public.
 */
export function withOptionalAuth(handler: OptionalAuthHandler) {
  return async (request: Request) => {
    try {
      const supabase = await createClient(auditHeaders(request));
      let user: any = null;
      try {
        user = await getUserInfo({ supabase });
      } catch {}
      return await handler(request, { supabase, user });
    } catch (error) {
      return apiResponse.error((error as Error).message, 500);
    }
  };
}

/**
 * Wraps an API route handler with just a supabase client (no auth).
 * Useful for public endpoints like registration, OTP, etc.
 */
export function withPublic(handler: PublicHandler) {
  return async (request: Request) => {
    try {
      const supabase = await createClient(auditHeaders(request));
      return await handler(request, { supabase });
    } catch (error) {
      return apiResponse.error((error as Error).message, 500);
    }
  };
}
