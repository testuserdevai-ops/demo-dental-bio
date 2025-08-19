import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getDentistryInfo, getUserInfo } from '@/utils/userInfo';

export async function POST(request: Request) {
  const supabase = createClient();

  const userData = await getUserInfo({ supabase });
  const dentistryData = await getDentistryInfo({ supabase, user_id: userData.id })

  const { business_name, full_address, city, latitude, longitude } = await request.json();

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
    .eq("id", userData.id)
    .single();

  const { data: dentistryLocation, error: joinError } = await supabase
    .from("dentistry_locations")
    .select("location_id")
    .eq("dentistry_id", dentistryData.dentistry_id)
    .single();

  if (joinError || !dentistryLocation || (userRecord?.subscription_status === "PRO" || userRecord?.subscription_status === "PREMIUM PRO")) {
    const { data: insertedLocation, error: insertError } = await supabase
      .from("locations")
      .insert([newLocation])
      .select("location_id")
      .single();

    if (insertError) {
      NextResponse.redirect("/location?error=Failed to create location");
    }

    const { error: linkError } = await supabase
      .from("dentistry_locations")
      .insert([{ dentistry_id: dentistryData.dentistry_id, location_id: insertedLocation?.location_id }]);

    if (linkError) {
      NextResponse.redirect("/location?error=Failed to link location to dentistry");
    }
  } else {

  }
}

export async function DELETE(request: Request) {
  const { location_id } = await request.json();

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('locations')
      .delete()
      .eq('location_id', location_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}