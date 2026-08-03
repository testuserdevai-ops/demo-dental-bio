export async function getMaxRank({
  supabase,
  table,
  field,
  value,
}: {
  supabase: any;
  table: string;
  field: string;
  value: any;
}) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq(field, value);

    if (error) {
      return 0;
    }

    const maxRank = data.reduce(
      (max: number, item: any) => (item.rank > max ? item.rank : max),
      0,
    );
    return maxRank;
  } catch (error) {
    console.log(error);
    return 0;
  }
}
