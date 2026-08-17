import type { PublicProfileViewModel } from "./public-profile";

type PublicTreatment = PublicProfileViewModel["treatments"][number];

export type ProfileInventoryItem = {
  id: string;
  title: string;
  description: string | null;
  rank: number;
  position: number;
  kind: "treatment" | "service";
};

export type ProfileTreatmentServiceSelection = {
  treatments: ProfileInventoryItem[];
  services: ProfileInventoryItem[];
};

function normalizeItem(
  entry: PublicTreatment,
): Omit<ProfileInventoryItem, "position"> | null {
  const id = entry.treatment_id?.trim();
  const title = entry.treatments?.title?.trim();
  if (!id || !title) return null;

  const description = entry.treatments?.description?.trim() || null;
  return {
    id,
    title,
    description,
    rank: Number.isFinite(entry.rank) ? entry.rank : Number.MAX_SAFE_INTEGER,
    kind: entry.treatments?.isService === true ? "service" : "treatment",
  };
}

function byRankThenId(
  left: Omit<ProfileInventoryItem, "position">,
  right: Omit<ProfileInventoryItem, "position">,
) {
  return left.rank - right.rank || left.id.localeCompare(right.id);
}

export function selectProfileTreatmentServices(
  entries: readonly PublicTreatment[] | null | undefined,
): ProfileTreatmentServiceSelection {
  const eligible = Array.isArray(entries)
    ? entries.flatMap((entry) => {
        const item = entry && normalizeItem(entry);
        return item ? [item] : [];
      })
    : [];

  const withPositions = (kind: ProfileInventoryItem["kind"]) =>
    eligible
      .filter((item) => item.kind === kind)
      .sort(byRankThenId)
      .map((item, index) => ({ ...item, position: index + 1 }));

  return {
    treatments: withPositions("treatment"),
    services: withPositions("service"),
  };
}
