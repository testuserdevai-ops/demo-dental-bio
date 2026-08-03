"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    // Instead of redirecting, return the error message
    return { error: error.message };
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("email", data.email)
    .single();

  const isAdmin = userData!.role === "admin";

  if (isAdmin) {
    revalidatePath("/", "layout");
    redirect("/admin");
  } else {
    const { error } = await supabase.auth.signOut();

    return { error: "Access is restricted to admin users only." };
  }
}
