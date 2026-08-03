import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

type RankableTable =
  | "blog_groups"
  | "blogs"
  | "galleries"
  | "general_galleries"
  | "groups"
  | "products"
  | "reviews"
  | "videos";

type RankableField = "group_id" | "user_id";
type RankedRow = { rank: number | null };

function maxRank(rows: readonly RankedRow[]) {
  return rows.reduce(
    (max, item) => (item.rank !== null && item.rank > max ? item.rank : max),
    0,
  );
}

export async function getMaxRank({
  supabase,
  table,
  field,
  value,
}: {
  supabase: SupabaseClient<Database>;
  table: RankableTable;
  field: RankableField;
  value: string | number | null;
}) {
  if (!value) return 0;

  try {
    switch (table) {
      case "blog_groups": {
        const { data, error } = await supabase
          .from("blog_groups")
          .select("rank")
          .eq("user_id", String(value));
        return error || !data ? 0 : maxRank(data);
      }
      case "blogs": {
        const { data, error } = await supabase
          .from("blogs")
          .select("rank")
          .eq("group_id", Number(value));
        return error || !data ? 0 : maxRank(data);
      }
      case "galleries": {
        const { data, error } = await supabase
          .from("galleries")
          .select("rank")
          .eq("user_id", String(value));
        return error || !data ? 0 : maxRank(data);
      }
      case "general_galleries": {
        const { data, error } = await supabase
          .from("general_galleries")
          .select("rank")
          .eq("user_id", String(value));
        return error || !data ? 0 : maxRank(data);
      }
      case "groups": {
        const { data, error } = await supabase
          .from("groups")
          .select("rank")
          .eq("user_id", String(value));
        return error || !data ? 0 : maxRank(data);
      }
      case "products": {
        const column = field === "group_id" ? "group_id" : "user_id";
        const filterValue =
          column === "group_id" ? Number(value) : String(value);
        const { data, error } = await supabase
          .from("products")
          .select("rank")
          .eq(column, filterValue);
        return error || !data ? 0 : maxRank(data);
      }
      case "reviews": {
        const { data, error } = await supabase
          .from("reviews")
          .select("rank")
          .eq("user_id", String(value));
        return error || !data ? 0 : maxRank(data);
      }
      case "videos": {
        const { data, error } = await supabase
          .from("videos")
          .select("rank")
          .eq("group_id", Number(value));
        return error || !data ? 0 : maxRank(data);
      }
    }
  } catch (error) {
    console.error("Unable to determine rank:", error);
    return 0;
  }
}
