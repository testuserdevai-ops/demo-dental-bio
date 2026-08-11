import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

export type LocationRouterLocation = {
  location_id: string | null;
  locations: {
    country: string | null;
    city: string | null;
    area: string | null;
    latitude: number | null;
    longitude: number | null;
    full_address: string | null;
    business_name: string | null;
  } | null;
};

export type LocationRouterOption = {
  id: string;
  label: string;
  summary: string;
  position: number;
  location: NonNullable<LocationRouterLocation["locations"]>;
};

export type LocationRouterMode = NonNullable<
  ProfileTemplateAnswers["location-provider-router"]["routerKind"]
>;

export type LocationRouterCopy = {
  eyebrow: string;
  selectorLabel: string;
  introduction: string;
};

const routerCopy: Record<LocationRouterMode, LocationRouterCopy> = {
  location: {
    eyebrow: "Choose a practice",
    selectorLabel: "Practice location",
    introduction:
      "Select the practice that suits you to see its details and contact options.",
  },
  provider: {
    eyebrow: "Choose your care team",
    selectorLabel: "Clinician location",
    introduction:
      "Select the clinic where you would like to meet the right clinician for your care.",
  },
  "appointment-type": {
    eyebrow: "Choose your appointment path",
    selectorLabel: "Appointment location",
    introduction:
      "Select where you would like to be seen to continue with the right appointment route.",
  },
};

function clean(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function getLocationRouterCopy(
  answers: ProfileTemplateAnswers["location-provider-router"],
): LocationRouterCopy {
  return routerCopy[answers.routerKind ?? "location"];
}

export function getLocationRouterLabel(
  location: NonNullable<LocationRouterLocation["locations"]>,
): string {
  return (
    clean(location.business_name) ??
    clean(location.city) ??
    clean(location.area) ??
    "Practice location"
  );
}

export function getLocationRouterSummary(
  location: NonNullable<LocationRouterLocation["locations"]>,
): string {
  return (
    clean(location.full_address) ??
    [location.area, location.city, location.country]
      .map(clean)
      .filter((part): part is string => Boolean(part))
      .join(", ") ??
    ""
  );
}

export function createLocationRouterState(
  answers: ProfileTemplateAnswers["location-provider-router"],
  locations: readonly LocationRouterLocation[],
): {
  options: LocationRouterOption[];
  defaultOptionId: string | null;
  recoveredDefault: boolean;
} {
  const seen = new Set<string>();
  const options = locations.flatMap((entry) => {
    if (!entry.location_id || !entry.locations || seen.has(entry.location_id)) {
      return [];
    }

    seen.add(entry.location_id);
    return [
      {
        id: entry.location_id,
        label: getLocationRouterLabel(entry.locations),
        summary: getLocationRouterSummary(entry.locations),
        position: seen.size,
        location: entry.locations,
      },
    ];
  });
  const configuredDefault = answers.defaultLocationId;
  const hasConfiguredDefault = options.some(
    ({ id }) => id === configuredDefault,
  );

  return {
    options,
    defaultOptionId: hasConfiguredDefault
      ? configuredDefault!
      : (options[0]?.id ?? null),
    recoveredDefault: Boolean(configuredDefault && !hasConfiguredDefault),
  };
}

function normalizeHttpUrl(value: string | null): string | null {
  const input = clean(value);
  if (!input) return null;

  try {
    const url = new URL(
      /^https?:\/\//i.test(input) ? input : `https://${input}`,
    );
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function createLocationRouterBookingHref(dentistry: {
  booking_link: string | null;
  booking_link_enabled: boolean | null;
}): string | null {
  return dentistry.booking_link_enabled
    ? normalizeHttpUrl(dentistry.booking_link)
    : null;
}

export function createLocationRouterPhoneHref(value: string | null) {
  const input = clean(value);
  if (!input) return null;
  const prefix = input.startsWith("+") ? "+" : "";
  const digits = input.replace(/\D/g, "");
  return digits.length >= 7 ? `tel:${prefix}${digits}` : null;
}

export function createLocationRouterEmailHref(value: string | null) {
  const input = clean(value);
  return input && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)
    ? `mailto:${input}`
    : null;
}
