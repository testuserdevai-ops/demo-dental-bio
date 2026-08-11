export type PublicLocationDetails = {
  country: string | null;
  city: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  full_address: string | null;
  business_name: string | null;
};

export function getLocationLabel(location: PublicLocationDetails): string {
  return (
    location.business_name?.trim() ||
    location.city?.trim() ||
    location.area?.trim() ||
    "Practice location"
  );
}

export function getLocationSummary(location: PublicLocationDetails): string {
  return (
    location.full_address?.trim() ||
    [location.area, location.city, location.country]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(", ") ||
    "Address details are not available."
  );
}

export function createExternalDirectionsUrl(
  location: PublicLocationDetails,
): string {
  const hasCoordinates =
    typeof location.latitude === "number" &&
    Number.isFinite(location.latitude) &&
    location.latitude >= -90 &&
    location.latitude <= 90 &&
    typeof location.longitude === "number" &&
    Number.isFinite(location.longitude) &&
    location.longitude >= -180 &&
    location.longitude <= 180;
  const destination = hasCoordinates
    ? `${location.latitude},${location.longitude}`
    : getLocationSummary(location);
  const params = new URLSearchParams({ api: "1", destination });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
