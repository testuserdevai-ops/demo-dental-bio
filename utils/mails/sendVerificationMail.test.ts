import { afterEach, expect, mock, test } from "bun:test";

import type { DomainConfig } from "../domainConfig";

mock.module("server-only", () => ({}));

const originalResendApiKey = process.env.RESEND_API_KEY;

const domainConfig: DomainConfig = {
  domain: "dental.test",
  brandName: "Dentalbio",
  vertical: "dental",
  logoPath: "/logo.svg",
  heroImage: "/hero.webp",
  menuImage: "/menu.webp",
  emailFrom: "Biocloud",
  supportEmail: "Support",
  contactEmail: "support@example.test",
  baseUrl: "https://dental.test",
  positions: ["Dentist"],
};

afterEach(() => {
  if (originalResendApiKey === undefined) {
    delete process.env.RESEND_API_KEY;
    return;
  }
  process.env.RESEND_API_KEY = originalResendApiKey;
});

test("verification mail propagates delivery failure to its webhook caller", async () => {
  delete process.env.RESEND_API_KEY;
  const { sendVerificationMail } = await import("./sendVerificationMail");

  await expect(
    sendVerificationMail("owner@example.test", "owner", "Owner", domainConfig),
  ).rejects.toThrow("Email delivery is not configured");
});
