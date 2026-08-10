import { z } from "zod";
const text = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max);
const optional = z.string().trim().max(150);
const fields = {
  businessName: text("Business name", 150),
  fullAddress: text("Address", 300),
  country: optional,
  city: text("City", 150),
  area: optional,
  latitude: z.coerce.number().finite().min(-90).max(90),
  longitude: z.coerce.number().finite().min(-180).max(180),
};
export const locationTitleSchema = z
  .object({ title: text("Location title", 100) })
  .strict();
export const createLocationSchema = z.object(fields).strict();
export const updateLocationSchema = z
  .object({
    ...fields,
    id: z.string().uuid(),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export const deleteLocationSchema = z
  .object({ id: z.string().uuid() })
  .strict();
export type LocationTitleInput = z.infer<typeof locationTitleSchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type DeleteLocationInput = z.infer<typeof deleteLocationSchema>;
