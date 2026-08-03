import { createClient } from "./server";

// This function will check if a user is authenticated
export async function checkSession() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;

  return data.user;
}
