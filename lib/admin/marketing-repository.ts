import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export type MarketingUnsubscribeSource = "one-click" | "link";

export async function recordMarketingUnsubscribe(
  email: string,
  source: MarketingUnsubscribeSource,
): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from("marketing_unsubscribes")
      .upsert({ email, source }, { onConflict: "email" });

    if (error) throw error;
  } catch (error) {
    throw new Error("Marketing unsubscribe write failed", { cause: error });
  }
}

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
