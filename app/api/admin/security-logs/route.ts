import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import supabaseAdmin from "@/utils/supabase/supabaseAdmin";

// GET - List security logs with pagination and filtering
export const GET = withAuth(async (request, { user }) => {
  if (user.role !== "admin") {
    return apiResponse.forbidden();
  }

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "25");
  const eventType = url.searchParams.get("event_type") || "";
  const email = url.searchParams.get("email") || "";
  const ip = url.searchParams.get("ip") || "";

  const start = (page - 1) * limit;
  const end = start + limit - 1;

  let query = supabaseAdmin
    .from("security_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (eventType) {
    query = query.eq("event_type", eventType);
  }
  if (email) {
    query = query.ilike("email", `%${email}%`);
  }
  if (ip) {
    query = query.ilike("ip_address", `%${ip}%`);
  }

  const { data, count, error } = await query.range(start, end);

  if (error) {
    return apiResponse.error(error.message, 500);
  }

  return apiResponse.success({ data, count });
});
