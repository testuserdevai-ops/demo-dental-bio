export type AppearancePreviewProfile = {
  initials: string;
  displayName: string;
  specialty: string;
  usesFallback: boolean;
};

type AppearancePreviewProfileSource = {
  title?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  position?: string | null;
};

const FALLBACK_PROFILE: AppearancePreviewProfile = {
  initials: "AM",
  displayName: "Dr Alex Morgan",
  specialty: "General and cosmetic dentist",
  usesFallback: true,
};

function clean(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function resolveAppearancePreviewProfile(
  source: AppearancePreviewProfileSource,
): AppearancePreviewProfile {
  const firstName = clean(source.firstName);
  const lastName = clean(source.lastName);
  if (!firstName && !lastName) return FALLBACK_PROFILE;

  const title = clean(source.title);
  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((part) => Array.from(part)[0]?.toLocaleUpperCase())
    .join("");

  return {
    initials: initials || "DP",
    displayName: [title, firstName, lastName].filter(Boolean).join(" "),
    specialty: clean(source.position) || "Dental professional",
    usesFallback: false,
  };
}
