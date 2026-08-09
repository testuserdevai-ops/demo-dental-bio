import { z } from "zod";

const requiredValue = (label: string) =>
  z.string().trim().min(1, `${label} is required`).max(512);

export const blockedIpFormSchema = z.object({
  ip: requiredValue("IP address"),
  reason: z.string().trim().max(512),
});

export const blockedFingerprintFormSchema = z.object({
  fingerprint: requiredValue("Fingerprint"),
  reason: z.string().trim().max(512),
});

export const blockedDomainFormSchema = z.object({
  domain: requiredValue("Domain"),
});

export type BlockedIpFormInput = z.infer<typeof blockedIpFormSchema>;
export type BlockedFingerprintFormInput = z.infer<
  typeof blockedFingerprintFormSchema
>;
export type BlockedDomainFormInput = z.infer<typeof blockedDomainFormSchema>;
