import type { PublicLocation } from "./public-profile";

export type ProfileLocation = Omit<
  PublicLocation,
  "location_id" | "locations"
> & {
  location_id: string;
  locations: NonNullable<PublicLocation["locations"]>;
  position: number;
};

type LocationCandidate = {
  location_id?: unknown;
  locations?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeLocationId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_PATTERN.test(id) ? id.toLowerCase() : null;
}

function isLocationRelation(
  value: unknown,
): value is NonNullable<PublicLocation["locations"]> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

/**
 * Public locations have no authored rank. Keep the selector deterministic by
 * their immutable UUID while rejecting partial join rows and malformed IDs.
 */
export function selectProfileLocations(input: unknown): ProfileLocation[] {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const locations = input.flatMap(
    (candidate): Omit<ProfileLocation, "position">[] => {
      if (
        !candidate ||
        typeof candidate !== "object" ||
        Array.isArray(candidate)
      ) {
        return [];
      }

      const { location_id: rawId, locations: relation } =
        candidate as LocationCandidate;
      const locationId = normalizeLocationId(rawId);
      if (
        !locationId ||
        seen.has(locationId) ||
        !isLocationRelation(relation)
      ) {
        return [];
      }

      seen.add(locationId);
      return [{ location_id: locationId, locations: relation }];
    },
  );

  return locations
    .slice()
    .sort((left, right) => left.location_id.localeCompare(right.location_id))
    .map((location, index) => ({ ...location, position: index + 1 }));
}
