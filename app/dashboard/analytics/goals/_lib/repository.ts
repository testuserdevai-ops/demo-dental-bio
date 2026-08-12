import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ConversionGoalEntityOption = {
  value: string;
  entityType:
    | "link_click"
    | "product_click"
    | "treatment_cta_click"
    | "service_cta_click";
  label: string;
};

export async function readConversionGoalEntityOptions(
  dentistryId: string,
  profileId: string,
): Promise<ConversionGoalEntityOption[]> {
  const client = await createServerSupabaseClient();
  const [links, products, treatments] = await Promise.all([
    client
      .from("link_groups")
      .select("dentistry_links(links(link_id,title))")
      .eq("dentistry_id", dentistryId),
    client.from("products").select("id,name").eq("user_id", profileId),
    client
      .from("dentistry_treatments")
      .select("treatments(treatment_id,title,isService)")
      .eq("dentistry_id", dentistryId),
  ]);
  if (links.error || products.error || treatments.error) {
    throw new Error("Unable to load goal options");
  }
  return [
    ...(links.data ?? []).flatMap((group) =>
      (group.dentistry_links ?? []).flatMap((join) => {
        const link = Array.isArray(join.links) ? join.links[0] : join.links;
        return link?.link_id
          ? [
              {
                value: link.link_id,
                entityType: "link_click" as const,
                label: `Link · ${link.title}`,
              },
            ]
          : [];
      }),
    ),
    ...(products.data ?? []).map((product) => ({
      value: String(product.id),
      entityType: "product_click" as const,
      label: `Product · ${product.name ?? "Untitled product"}`,
    })),
    ...(treatments.data ?? []).flatMap((join) => {
      const treatment = Array.isArray(join.treatments)
        ? join.treatments[0]
        : join.treatments;
      return treatment?.treatment_id
        ? [
            {
              value: treatment.treatment_id,
              entityType: treatment.isService
                ? ("service_cta_click" as const)
                : ("treatment_cta_click" as const),
              label: `${treatment.isService ? "Service" : "Treatment"} · ${treatment.title ?? "Untitled"}`,
            },
          ]
        : [];
    }),
  ];
}
