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
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "[::1]", "localhost"]);
const PUBLIC_STORAGE_PATH = "/storage/v1/object/public/location-images/";

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

export function resolveLocationMediaUrl(
  value: string | null,
  storageOrigin?: string,
): string | null {
  const source = value?.trim();
  const target = storageOrigin?.trim();
  if (!source || !target) return source ?? null;

  try {
    const sourceUrl = new URL(source);
    const targetUrl = new URL(target);
    const validTarget =
      (targetUrl.protocol === "https:" ||
        (targetUrl.protocol === "http:" &&
          LOOPBACK_HOSTS.has(targetUrl.hostname))) &&
      !targetUrl.username &&
      !targetUrl.password &&
      targetUrl.pathname === "/" &&
      !targetUrl.search &&
      !targetUrl.hash;

    if (
      !validTarget ||
      sourceUrl.protocol !== "http:" ||
      !LOOPBACK_HOSTS.has(sourceUrl.hostname) ||
      !sourceUrl.pathname.startsWith(PUBLIC_STORAGE_PATH) ||
      sourceUrl.username ||
      sourceUrl.password
    ) {
      return source;
    }

    return new URL(
      `${sourceUrl.pathname}${sourceUrl.search}${sourceUrl.hash}`,
      targetUrl.origin,
    ).toString();
  } catch {
    return source;
  }
}

/**
 * Public locations have no authored rank. Keep the selector deterministic by
 * their immutable UUID while rejecting partial join rows and malformed IDs.
 */
export function selectProfileLocations(
  input: unknown,
  storageOrigin?: string,
): ProfileLocation[] {
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
      return [
        {
          location_id: locationId,
          locations: {
            ...relation,
            image_url: resolveLocationMediaUrl(
              relation.image_url,
              storageOrigin,
            ),
          },
        },
      ];
    },
  );

  return locations
    .slice()
    .sort((left, right) => left.location_id.localeCompare(right.location_id))
    .map((location, index) => ({ ...location, position: index + 1 }));
}
