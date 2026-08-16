import { afterEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const originalAppEnvironment = process.env.APP_ENV;
const { resolveRegistrationDomain } = await import("./registration-domain");
const { getAllDomains } = await import("@/utils/domainConfig");

afterEach(() => {
  if (originalAppEnvironment === undefined) {
    delete process.env.APP_ENV;
  } else {
    process.env.APP_ENV = originalAppEnvironment;
  }
});

describe("resolveRegistrationDomain", () => {
  it("allows every configured brand on the approved staging alias", () => {
    process.env.APP_ENV = "staging";
    const request = new Request(
      "https://dentalbio-staging-seven.vercel.app/api/register/send-otp",
    );

    for (const domain of getAllDomains()) {
      expect(resolveRegistrationDomain(request, domain)?.domain).toBe(domain);
    }
  });

  it("does not exempt the staging alias outside the staging environment", () => {
    process.env.APP_ENV = "production";
    const request = new Request(
      "https://dentalbio-staging-seven.vercel.app/api/register/send-otp",
    );

    expect(resolveRegistrationDomain(request, "dental.bio")).toBeNull();
  });

  it("does not exempt arbitrary Vercel deployment hosts in staging", () => {
    process.env.APP_ENV = "staging";
    const request = new Request(
      "https://untrusted-preview.vercel.app/api/register/send-otp",
    );

    expect(resolveRegistrationDomain(request, "dental.bio")).toBeNull();
  });
});
