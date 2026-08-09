import { z } from "zod";

export const offerCodeSchema = z.object({
  university: z
    .string()
    .trim()
    .min(1, "Enter a university")
    .max(160, "University must be 160 characters or fewer"),
  offer_code: z
    .string()
    .trim()
    .min(1, "Enter an offer code")
    .max(80, "Offer code must be 80 characters or fewer"),
});

export type OfferCodeInput = z.infer<typeof offerCodeSchema>;
