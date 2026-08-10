import "server-only";
import type { DashboardScope } from "@/lib/dashboard/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export type ProductViewModel = {
  id: number;
  name: string;
  link: string;
  platform: string;
  imageUrl: string;
  price: number;
  currency: string;
  enabled: boolean;
  rank: number;
};
export type ProductAggregate = { products: ProductViewModel[] };
export async function getProductAggregate(
  scope: DashboardScope,
  client?: Awaited<ReturnType<typeof createServerSupabaseClient>>,
): Promise<ProductAggregate> {
  const supabase = client ?? (await createServerSupabaseClient());
  const { data, error } = await supabase
    .from("products")
    .select("id,name,link,platform,image_url,price,currency,enabled,rank")
    .eq("user_id", scope.effectiveUserId)
    .order("rank", { nullsFirst: false });
  if (error) throw new Error("Unable to load products");
  return {
    products: (data ?? []).map((row, index) => ({
      id: row.id,
      name: row.name ?? "",
      link: row.link ?? "",
      platform: row.platform ?? "",
      imageUrl: row.image_url ?? "",
      price: row.price ?? 0,
      currency: row.currency ?? "GBP(£)",
      enabled: row.enabled ?? true,
      rank: row.rank ?? index + 1,
    })),
  };
}
