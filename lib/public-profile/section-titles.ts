import { z } from "zod";

export const DEFAULT_TREATMENT_SECTION_TITLE = "Treatments";
export const DEFAULT_SERVICE_SECTION_TITLE = "Services";
export const SECTION_TITLE_MAX_LENGTH = 100;

const plainTextSectionTitleSchema = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(SECTION_TITLE_MAX_LENGTH, `${label} must be 100 characters or less`)
    .regex(/^[^\u0000-\u001f\u007f]*$/u, `${label} must be plain text`);

export const treatmentServiceSectionTitlesSchema = z
  .object({
    treatmentSectionTitle: plainTextSectionTitleSchema(
      "Treatment section title",
    ),
    serviceSectionTitle: plainTextSectionTitleSchema("Service section title"),
  })
  .strict();

export type TreatmentServiceSectionTitlesInput = z.infer<
  typeof treatmentServiceSectionTitlesSchema
>;

export function normalizeSectionTitle(
  value: unknown,
  fallback: string,
): string {
  const result = plainTextSectionTitleSchema("Section title").safeParse(value);
  return result.success ? result.data : fallback;
}

export function resolveTreatmentServiceSectionTitles(source: {
  treatment_section_title?: unknown;
  service_section_title?: unknown;
}): TreatmentServiceSectionTitlesInput {
  return {
    treatmentSectionTitle: normalizeSectionTitle(
      source.treatment_section_title,
      DEFAULT_TREATMENT_SECTION_TITLE,
    ),
    serviceSectionTitle: normalizeSectionTitle(
      source.service_section_title,
      DEFAULT_SERVICE_SECTION_TITLE,
    ),
  };
}
