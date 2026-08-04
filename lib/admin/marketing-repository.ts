import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export async function listSuppressedMarketingEmails(emails: string[]) {
  const suppressed: string[] = [];

  for (let index = 0; index < emails.length; index += 200) {
    const { data, error } = await supabaseAdmin
      .from("marketing_unsubscribes")
      .select("email")
      .in("email", emails.slice(index, index + 200));

    if (error)
      throw new Error(`Marketing suppression read failed: ${error.message}`);
    for (const row of data ?? []) suppressed.push(row.email);
  }

  return suppressed;
}
