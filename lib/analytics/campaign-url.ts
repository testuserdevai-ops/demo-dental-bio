import { z } from "zod";

export const MANAGED_UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export const campaignSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(64)
  .refine(
    (value) => value === "" || /^[a-z0-9][a-z0-9._-]{0,63}$/.test(value),
    "Use lowercase letters, numbers, dots, dashes, or underscores",
  );

export const managedCampaignFieldsSchema = z.object({
  campaignEnabled: z.boolean(),
  campaignSource: campaignSlugSchema,
  campaignMedium: campaignSlugSchema,
  campaignName: campaignSlugSchema,
  campaignContent: campaignSlugSchema,
  campaignTerm: campaignSlugSchema,
});

export type ManagedCampaignFields = z.infer<typeof managedCampaignFieldsSchema>;

function normalizeHttpUrl(value: string): URL {
  try {
    const trimmed = value.trim();
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:/i.test(trimmed)) {
      throw new Error();
    }
    const input = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(input);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error();
    }
    return url;
  } catch {
    throw new Error("Enter a valid HTTP(S) URL");
  }
}

export function validateManagedCampaign(
  destination: string,
  fields: ManagedCampaignFields,
): string | null {
  if (!fields.campaignEnabled) return null;
  if (
    !fields.campaignSource ||
    !fields.campaignMedium ||
    !fields.campaignName
  ) {
    return "Source, medium, and campaign are required";
  }
  try {
    const url = normalizeHttpUrl(destination);
    const duplicate = MANAGED_UTM_KEYS.find(
      (key) => url.searchParams.getAll(key).length > 0,
    );
    if (duplicate) {
      return `Remove the existing ${duplicate} parameter before using the campaign builder`;
    }
  } catch {
    return "Enter a valid HTTP(S) URL";
  }
  return null;
}

export function buildManagedCampaignUrl(
  destination: string,
  fields: ManagedCampaignFields,
): string {
  const url = normalizeHttpUrl(destination);
  if (!fields.campaignEnabled) return url.toString();
  const validation = validateManagedCampaign(destination, fields);
  if (validation) throw new Error(validation);

  url.searchParams.append("utm_source", fields.campaignSource);
  url.searchParams.append("utm_medium", fields.campaignMedium);
  url.searchParams.append("utm_campaign", fields.campaignName);
  if (fields.campaignContent) {
    url.searchParams.append("utm_content", fields.campaignContent);
  }
  if (fields.campaignTerm) {
    url.searchParams.append("utm_term", fields.campaignTerm);
  }
  const finalUrl = url.toString();
  if (finalUrl.length > 2048) throw new Error("Campaign URL is too long");
  return finalUrl;
}
