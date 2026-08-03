export async function getUserInfo({ supabase }: { supabase: any }) {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", user.email)
      .single();

    if (userError) {
      return null;
    }

    return userData;
  } catch (error) {
    return null;
  }
}

export async function getDentistryInfo({
  supabase,
  user_id,
}: {
  supabase: any;
  user_id: string;
}) {
  try {
    const { data: dentistry, error: dentistryError } = await supabase
      .from("dentistries")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (dentistryError) {
      return null;
    }

    return dentistry;
  } catch (error) {
    return null;
  }
}
