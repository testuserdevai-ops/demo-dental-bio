import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import { treatmentSchema } from "@/lib/validation";

async function canManageDentistry(
  supabase: any,
  user: any,
  dentistryId: string,
) {
  const { data: dentistry, error } = await supabase
    .from("dentistries")
    .select("user_id")
    .eq("dentistry_id", dentistryId)
    .single();

  if (error || !dentistry)
    return { error: apiResponse.badRequest("Dentistry not found") };
  if (dentistry.user_id !== user.id && user.role !== "admin") {
    return { error: apiResponse.forbidden() };
  }

  return { error: null };
}

function validationError(body: unknown) {
  const result = treatmentSchema.safeParse(body);
  if (result.success) return { data: result.data, error: null };

  return {
    data: null,
    error: apiResponse.badRequest(
      result.error.issues[0]?.message || "Invalid treatment",
    ),
  };
}

export const POST = withAuth(async (request, { supabase, user }) => {
  const body = await request.json();
  const { dentistryId, isService } = body;

  if (typeof dentistryId !== "string" || typeof isService !== "boolean") {
    return apiResponse.badRequest("Dentistry and treatment type are required");
  }

  const access = await canManageDentistry(supabase, user, dentistryId);
  if (access.error) return access.error;

  const validated = validationError(body);
  if (validated.error) return validated.error;

  const { data: rankData, error: rankError } = await supabase
    .from("dentistry_treatments")
    .select("rank")
    .eq("dentistry_id", dentistryId)
    .order("rank", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (rankError) return apiResponse.badRequest(rankError.message);
  const rank = (rankData?.rank ?? 0) + 1;

  const { data: treatment, error: treatmentError } = await supabase
    .from("treatments")
    .insert([{ title: body.title, description: body.description, isService }])
    .select("treatment_id, title, description")
    .single();

  if (treatmentError) return apiResponse.badRequest(treatmentError.message);

  const { error: linkError } = await supabase
    .from("dentistry_treatments")
    .insert([
      { dentistry_id: dentistryId, treatment_id: treatment.treatment_id, rank },
    ]);

  if (linkError) {
    await supabase
      .from("treatments")
      .delete()
      .eq("treatment_id", treatment.treatment_id);
    return apiResponse.badRequest(linkError.message);
  }

  return apiResponse.success({ ...treatment, rank }, 201);
});

export const PUT = withAuth(async (request, { supabase, user }) => {
  const body = await request.json();
  const { dentistryId, treatmentId } = body;

  if (typeof dentistryId !== "string" || typeof treatmentId !== "string") {
    return apiResponse.badRequest("Dentistry and treatment are required");
  }

  const access = await canManageDentistry(supabase, user, dentistryId);
  if (access.error) return access.error;

  const validated = validationError(body);
  if (validated.error) return validated.error;

  const { data: link, error: linkError } = await supabase
    .from("dentistry_treatments")
    .select("treatment_id")
    .eq("dentistry_id", dentistryId)
    .eq("treatment_id", treatmentId)
    .maybeSingle();

  if (linkError || !link) return apiResponse.badRequest("Treatment not found");

  const { data: treatment, error } = await supabase
    .from("treatments")
    .update({ title: body.title, description: body.description })
    .eq("treatment_id", treatmentId)
    .select("treatment_id, title, description")
    .single();

  if (error) return apiResponse.badRequest(error.message);
  return apiResponse.success(treatment);
});
