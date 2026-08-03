import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

type DatabaseClient = SupabaseClient<Database>;

export async function getUserInfo({ supabase }: { supabase: DatabaseClient }) {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    if (!user.email) return null;

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
  supabase: DatabaseClient;
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
