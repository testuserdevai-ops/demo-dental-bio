import { convertToSlug } from "./convertToSlug";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export async function generateUniqueSlug(
  supabase: SupabaseClient<Database>,
  slug: string,
  id?: string | null,
): Promise<string> {
  const baseSlug = convertToSlug(slug);

  let uniqueSlug = baseSlug;
  let counter = 1;

  // Check if the slug already exists in the database
  while (await slugExists(supabase, uniqueSlug, id || null)) {
    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
}

async function slugExists(
  supabase: SupabaseClient<Database>,
  slug: string,
  id: string | null,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("blogs")
    .select("id")
    .eq("slug", slug);

  if (error) {
    console.error("Error checking slug existence:", error.message);
    return false;
  }

  if (id) return data.filter((blog) => String(blog.id) !== id).length > 0;
  return data.length > 0;
}
