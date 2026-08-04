import { z } from "zod";
import { normalizeDomain } from "@/lib/customDomain";

export const connectDomainSchema = z.object({
  domain: z
    .string()
    .trim()
    .min(1, "Enter a domain")
    .refine(
      (value) => normalizeDomain(value) !== null,
      "Enter a valid domain, for example example.com",
    ),
});

export type ConnectDomainInput = z.infer<typeof connectDomainSchema>;
