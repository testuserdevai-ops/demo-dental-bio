import type { ProfileTemplateId } from "@/lib/profile-presentation/catalog";

export const AVAILABLE_PUBLIC_TEMPLATE_IDS = [
  "basic",
  "direct-booking",
  "location-provider-router",
  "cosmetic-transformation",
] as const satisfies readonly ProfileTemplateId[];

export type AvailablePublicTemplateId =
  (typeof AVAILABLE_PUBLIC_TEMPLATE_IDS)[number];

export function selectAvailablePublicTemplate(
  requestedTemplateId: ProfileTemplateId,
): AvailablePublicTemplateId {
  return AVAILABLE_PUBLIC_TEMPLATE_IDS.includes(
    requestedTemplateId as AvailablePublicTemplateId,
  )
    ? (requestedTemplateId as AvailablePublicTemplateId)
    : "basic";
}
