import type { ProfilePresentationTier } from "@/lib/profile-presentation/catalog";

export type AppearanceChoiceAvailability = {
  label: "Free" | "Pro" | "Pro · Locked";
  locked: boolean;
};

export function resolveAppearanceChoiceAvailability(
  minimumTier: ProfilePresentationTier,
  entitlementTier: ProfilePresentationTier,
): AppearanceChoiceAvailability {
  if (minimumTier === "free") return { label: "Free", locked: false };
  if (entitlementTier === "pro") return { label: "Pro", locked: false };
  return { label: "Pro · Locked", locked: true };
}
