import supabaseAdmin from "../supabase/supabaseAdmin";

export async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    // Fetch users with the Admin API
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error("Error fetching users:", error);
      return null;
    }

    // Find the user by email
    const user = data.users.find((u) => u.email === email);

    if (!user) {
      console.log("User not found");
      return null;
    }

    // Return the user's ID
    return user.id;
  } catch (err) {
    console.error("Unexpected error:", err);
    return null;
  }
}
