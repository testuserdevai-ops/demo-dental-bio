import { z } from "zod";
import { TREATMENT_DESCRIPTION_MAX_LENGTH } from "@/lib/treatmentDescription";

const treatmentFieldsSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(100, "Title too long"),
    description: z
      .string()
      .trim()
      .min(1, "Description is required")
      .max(TREATMENT_DESCRIPTION_MAX_LENGTH, {
        message: `Description must be ${TREATMENT_DESCRIPTION_MAX_LENGTH} characters or less`,
      }),
    kind: z.enum(["treatment", "service"]),
  })
  .strict();

export const createTreatmentInputSchema = treatmentFieldsSchema;
export const updateTreatmentInputSchema = treatmentFieldsSchema
  .extend({ treatmentId: z.string().uuid() })
  .strict();
export const deleteTreatmentInputSchema = z
  .object({ treatmentId: z.string().uuid() })
  .strict();
export const reorderTreatmentsInputSchema = z
  .object({ orderedIds: z.array(z.string().uuid()).min(1) })
  .strict()
  .superRefine(({ orderedIds }, context) => {
    if (new Set(orderedIds).size !== orderedIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "IDs must be unique",
      });
    }
  });

export type CreateTreatmentInput = z.infer<typeof createTreatmentInputSchema>;
export type UpdateTreatmentInput = z.infer<typeof updateTreatmentInputSchema>;
export type DeleteTreatmentInput = z.infer<typeof deleteTreatmentInputSchema>;
export type ReorderTreatmentsInput = z.infer<
  typeof reorderTreatmentsInputSchema
>;
