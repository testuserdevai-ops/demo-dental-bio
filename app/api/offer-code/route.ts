import { z } from "zod";
import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";

const offerCodeValueSchema = z
  .object({
    university: z.string().trim().min(1).max(160),
    offer_code: z.string().trim().min(1).max(80),
  })
  .strict();

const updateOfferCodeSchema = z
  .object({
    id: z.number().int().positive(),
    value: offerCodeValueSchema,
  })
  .strict();

const deleteOfferCodeSchema = z
  .object({ id: z.number().int().positive() })
  .strict();

function isAdmin(user: { role: string | null }) {
  return user.role === "admin";
}

async function parseRequest<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.output<T> | null> {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  return parsed.success ? parsed.data : null;
}

export const GET = withAuth(async (_request, { supabase, user }) => {
  if (!isAdmin(user)) return apiResponse.forbidden();

  const { data: offerCodeData, error: offerCodeError } = await supabase
    .from("offer_codes")
    .select("id,university,offer_code");

  if (offerCodeError) {
    return apiResponse.error(offerCodeError.message, 400);
  }

  return apiResponse.success(offerCodeData);
});

export const PUT = withAuth(async (request, { supabase, user }) => {
  if (!isAdmin(user)) return apiResponse.forbidden();
  const input = await parseRequest(request, updateOfferCodeSchema);
  if (!input) return apiResponse.badRequest("Invalid offer code request.");

  const { error: offerCodeError } = await supabase
    .from("offer_codes")
    .update(input.value)
    .eq("id", input.id);

  if (offerCodeError) {
    return apiResponse.error(offerCodeError.message, 400);
  }

  return apiResponse.success({ status: "success" });
});

export const POST = withAuth(async (request, { supabase, user }) => {
  if (!isAdmin(user)) return apiResponse.forbidden();
  const input = await parseRequest(request, offerCodeValueSchema);
  if (!input) return apiResponse.badRequest("Invalid offer code request.");

  const { error } = await supabase.from("offer_codes").insert(input);

  if (error) {
    return apiResponse.error(error.message, 400);
  }

  return apiResponse.success({ status: "success" });
});

export const DELETE = withAuth(async (request, { supabase, user }) => {
  if (!isAdmin(user)) return apiResponse.forbidden();
  const input = await parseRequest(request, deleteOfferCodeSchema);
  if (!input) return apiResponse.badRequest("Invalid offer code request.");

  const { error } = await supabase
    .from("offer_codes")
    .delete()
    .eq("id", input.id);

  if (error) {
    return apiResponse.error(error.message, 400);
  }

  return apiResponse.success({ status: "success" });
});
