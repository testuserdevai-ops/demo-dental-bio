import { getDentistryInfo } from "@/utils/userInfo";
import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";

export const POST = withAuth(async (request, { supabase, user }) => {
  const dentistryData = await getDentistryInfo({ supabase, user_id: user.id });

  const { business_name, full_address, city, latitude, longitude } =
    await request.json();

  const newLocation = {
    business_name,
    full_address,
    city,
    latitude,
    longitude,
  };

  const { data: userRecord, error: userError } = await supabase
    .from("users")
    .select("username, subscription_status, first_name")
    .eq("id", user.id)
    .single();

  const { data: dentistryLocation, error: joinError } = await supabase
    .from("dentistry_locations")
    .select("location_id")
    .eq("dentistry_id", dentistryData.dentistry_id)
    .single();

  if (
    joinError ||
    !dentistryLocation ||
    userRecord?.subscription_status === "PRO" ||
    userRecord?.subscription_status === "PREMIUM PRO"
  ) {
    const { data: insertedLocation, error: insertError } = await supabase
      .from("locations")
      .insert([newLocation])
      .select("location_id")
      .single();

    if (insertError) {
      return apiResponse.badRequest("Failed to create location");
    }

    const { error: linkError } = await supabase
      .from("dentistry_locations")
      .insert([
        {
          dentistry_id: dentistryData.dentistry_id,
          location_id: insertedLocation?.location_id,
        },
      ]);

    if (linkError) {
      return apiResponse.badRequest("Failed to link location to dentistry");
    }
  }

  return apiResponse.success({ status: "success" });
});

export const DELETE = withAuth(async (request, { supabase, user }) => {
  const { location_id } = await request.json();

  // Verify ownership: location must belong to the user's dentistry
  const dentistryData = await getDentistryInfo({ supabase, user_id: user.id });
  if (dentistryData) {
    const { data: link } = await supabase
      .from("dentistry_locations")
      .select("dentistry_id")
      .eq("location_id", location_id)
      .eq("dentistry_id", dentistryData.dentistry_id)
      .single();

    if (!link && user.role !== "admin") return apiResponse.forbidden();
  }

  const { data, error } = await supabase
    .from("locations")
    .delete()
    .eq("location_id", location_id);

  if (error) {
    return apiResponse.error(error.message, 400);
  }

  return apiResponse.success({ status: "success" });
});
