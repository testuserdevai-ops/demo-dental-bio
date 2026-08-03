import React from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import MapLoader from "./MapLoader";
import ManageLocations from "./ManageLocations";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";
import IntroText from "@/app/components/IntroText";
import { featureDescriptions } from "@/utils/global_constants";

// Utility function to fetch authenticated user, user ID, and dentistry ID
async function fetchUserAndDentistry(targetUserId: string) {
  "use server";
  const supabase = await createClient();

  const userId = await getEffectiveUserId({ targetUserId, supabase });

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("username, subscription_status, role")
    .eq("id", userId)
    .single();

  // Fetch Dentistry ID
  const { data: dentistry, error: dentistryError } = await supabase
    .from("dentistries")
    .select("dentistry_id")
    .eq("user_id", userId)
    .single();
  if (dentistryError || !dentistry) {
    redirect("/error?message=dentistry_not_found");
  }

  return { userId, userData, dentistryId: dentistry.dentistry_id };
}

// Fetch existing location data
async function fetchLocation(dentistryId: string) {
  "use server";
  const supabase = await createClient();

  const { data: dentistryLocation, error: joinError } = await supabase
    .from("dentistry_locations")
    .select("location_id")
    .eq("dentistry_id", dentistryId);

  if (joinError || !dentistryLocation) return null;

  const locationIdList = dentistryLocation.map(
    (location) => location.location_id,
  );

  const { data: locations, error: locationError } = await supabase
    .from("locations")
    .select("*")
    .in("location_id", locationIdList);

  return locationError ? null : locations;
}

async function fetchLocationTitle(dentistryId: string) {
  "use server";
  const supabase = await createClient();
  const { data: response, error: dentistryError } = await supabase
    .from("dentistries")
    .select("location_title")
    .eq("dentistry_id", dentistryId)
    .single();

  if (dentistryError) return "";
  return response.location_title;
}

// Save or update location data
async function updateLocation(locationData: LocationType, location_id: string) {
  "use server";
  const supabase = await createClient();

  const { error: updateError } = await supabase
    .from("locations")
    .update(locationData)
    .eq("location_id", location_id);

  if (updateError) {
    redirect("/location?error=Error updating location");
  }
}

// Main component
export default async function Location({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const { userId: targetUserId } = await searchParams;
  const { userData, dentistryId } = await fetchUserAndDentistry(
    targetUserId as string,
  );
  const locations = await fetchLocation(dentistryId);
  const location_title = await fetchLocationTitle(dentistryId);

  if (!userData) return redirect("/dashboard");

  const proAvailable =
    userData.subscription_status === "PRO" ||
    userData.subscription_status === "PREMIUM PRO";

  return (
    <div className="py-2">
      <MapLoader />
      <h2 className="text-xl font-semibold text-dark mb-3">Locations</h2>
      <IntroText>{featureDescriptions.locations}</IntroText>
      <ManageLocations
        locations={locations}
        location_title={location_title as string}
        updateLocation={updateLocation}
        proAvailable={proAvailable}
      />
    </div>
  );
}
