import "server-only";

import type { DashboardScope } from "@/lib/dashboard/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import type { QuestionContentOptions, QuestionOption } from "./registry";

type TreatmentJoin = {
  treatment_id: string | null;
  rank: number | null;
  treatments: { title: string | null; isService: boolean | null } | null;
};

type LocationJoin = {
  locations: {
    location_id: string;
    business_name: string | null;
    full_address: string | null;
  } | null;
};

type LinkGroup = {
  rank: number | null;
  dentistry_links:
    | {
        links: {
          link_id: string;
          title: string;
          is_active: boolean | null;
          rank: number;
        } | null;
      }[]
    | null;
};

function label(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

function numericOptions(
  rows: readonly { id: number; label: string }[],
): QuestionOption[] {
  return rows.map((row) => ({ id: String(row.id), label: row.label }));
}

export async function getQuestionContentOptions(
  scope: DashboardScope,
): Promise<QuestionContentOptions> {
  const supabase = await createServerSupabaseClient();
  const [
    treatmentsResult,
    locationsResult,
    reviewsResult,
    galleriesResult,
    linksResult,
    productsResult,
  ] = await Promise.all([
    supabase
      .from("dentistry_treatments")
      .select("treatment_id, rank, treatments(title, isService)")
      .eq("dentistry_id", scope.dentistryId)
      .order("rank", { nullsFirst: false }),
    supabase
      .from("dentistries")
      .select(
        "dentistry_locations(locations(location_id,business_name,full_address))",
      )
      .eq("dentistry_id", scope.dentistryId)
      .single(),
    supabase
      .from("reviews")
      .select("id,reviewer_name,platform,rank,enabled")
      .eq("user_id", scope.effectiveUserId)
      .eq("enabled", true)
      .order("rank", { nullsFirst: false }),
    supabase
      .from("galleries")
      .select("id,title,rank,enabled")
      .eq("user_id", scope.effectiveUserId)
      .eq("enabled", true)
      .order("rank", { nullsFirst: false }),
    supabase
      .from("link_groups")
      .select("rank,dentistry_links(links(link_id,title,is_active,rank))")
      .eq("dentistry_id", scope.dentistryId)
      .order("rank", { nullsFirst: false }),
    supabase
      .from("products")
      .select("id,name,platform,rank,enabled")
      .eq("user_id", scope.effectiveUserId)
      .eq("enabled", true)
      .order("rank", { nullsFirst: false }),
  ]);

  const firstError = [
    treatmentsResult.error,
    locationsResult.error,
    reviewsResult.error,
    galleriesResult.error,
    linksResult.error,
    productsResult.error,
  ].find(Boolean);
  if (firstError) throw new Error("Unable to load onboarding content options");

  const treatments = ((treatmentsResult.data ?? []) as TreatmentJoin[])
    .filter((row) => row.treatment_id && row.treatments?.isService !== true)
    .map((row) => ({
      id: row.treatment_id as string,
      label: label(row.treatments?.title, "Untitled treatment"),
    }));

  const locationJoins =
    ((locationsResult.data?.dentistry_locations ?? []) as LocationJoin[]) ?? [];
  const locations = locationJoins.flatMap(({ locations: location }) =>
    location
      ? [
          {
            id: location.location_id,
            label: label(location.business_name, "Saved location"),
            description: label(location.full_address, "Address not added"),
          },
        ]
      : [],
  );

  const reviews = numericOptions(
    (reviewsResult.data ?? []).map((review) => ({
      id: review.id,
      label: label(
        review.reviewer_name,
        review.platform ? `${review.platform} review` : "Saved review",
      ),
    })),
  );
  const galleries = numericOptions(
    (galleriesResult.data ?? []).map((gallery) => ({
      id: gallery.id,
      label: label(gallery.title, "Before-and-after case"),
    })),
  );

  const links = ((linksResult.data ?? []) as LinkGroup[]).flatMap((group) =>
    (group.dentistry_links ?? []).flatMap(({ links: link }) =>
      link?.is_active !== false
        ? [
            {
              id: link?.link_id ?? "",
              label: label(link?.title, "Untitled link"),
            },
          ].filter(({ id }) => id)
        : [],
    ),
  );
  const products = numericOptions(
    (productsResult.data ?? []).map((product) => ({
      id: product.id,
      label: label(
        product.name,
        product.platform ? `${product.platform} item` : "Saved product",
      ),
    })),
  );

  return { treatments, locations, reviews, galleries, links, products };
}
