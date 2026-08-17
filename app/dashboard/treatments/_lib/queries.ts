import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DashboardScope } from "@/lib/dashboard/types";
import { resolveTreatmentServiceSectionTitles } from "@/lib/public-profile/section-titles";

export type TreatmentItemViewModel = {
  id: string;
  title: string;
  description: string;
  kind: "treatment" | "service";
  rank: number;
};

export type TreatmentAggregate = {
  sectionTitles: {
    treatmentSectionTitle: string;
    serviceSectionTitle: string;
  };
  treatments: TreatmentItemViewModel[];
  services: TreatmentItemViewModel[];
};

type TreatmentJoin = {
  treatment_id: string | null;
  rank: number | null;
  treatments: {
    title: string | null;
    description: string | null;
    isService: boolean | null;
  } | null;
};

export async function getTreatmentAggregate(
  scope: DashboardScope,
  client?: Awaited<ReturnType<typeof createServerSupabaseClient>>,
): Promise<TreatmentAggregate> {
  const supabase = client ?? (await createServerSupabaseClient());
  const [{ data, error }, titlesResult] = await Promise.all([
    supabase
      .from("dentistry_treatments")
      .select("treatment_id, rank, treatments(title, description, isService)")
      .eq("dentistry_id", scope.dentistryId)
      .order("rank", { nullsFirst: false }),
    supabase
      .from("dentistries")
      .select("treatment_section_title, service_section_title")
      .eq("dentistry_id", scope.dentistryId)
      .single(),
  ]);

  if (error || titlesResult.error) throw new Error("Unable to load treatments");

  const items = ((data ?? []) as TreatmentJoin[])
    .flatMap((row, index): TreatmentItemViewModel[] => {
      if (!row.treatment_id || !row.treatments) return [];
      return [
        {
          id: row.treatment_id,
          title: row.treatments.title ?? "",
          description: row.treatments.description ?? "",
          kind: row.treatments.isService ? "service" : "treatment",
          rank: row.rank ?? index + 1,
        },
      ];
    })
    .sort((left, right) => left.rank - right.rank);

  return {
    sectionTitles: resolveTreatmentServiceSectionTitles(titlesResult.data),
    treatments: items.filter((item) => item.kind === "treatment"),
    services: items.filter((item) => item.kind === "service"),
  };
}
