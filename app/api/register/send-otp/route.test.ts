import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const sendOtpRouteModule = "./route.ts?registration-send-otp-test";
const { POST } = await import(sendOtpRouteModule);

const validBody = {
  username: "new-owner",
  title: "Dr",
  email: "owner@example.com",
  firstName: "New",
  lastName: "Owner",
  birthday: "04/05/2000",
  position: "Dentist",
  country: "Egypt",
  selectedDomain: "dental.bio",
  referral: "",
  offerCode: "",
  password: "Password!1",
  confirmPassword: "Password!1",
};

function request(body: unknown, host = "dental.bio") {
  return new Request("https://dental.bio/api/register/send-otp", {
    method: "POST",
    headers: { "content-type": "application/json", host },
    body: JSON.stringify(body),
  });
}

describe("POST /api/register/send-otp", () => {
  it("returns shared field errors before calling authentication for malformed input", async () => {
    const response = await POST(request({ email: "not-an-email" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
      fieldErrors: { email: expect.any(Array) },
    });
  });

  it("rejects a client-selected brand that does not match the request host", async () => {
    const response = await POST(
      request({ ...validBody, selectedDomain: "coach.bio" }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "INVALID_DOMAIN",
      formError: "This registration link is not valid for this domain.",
    });
  });

  it("rejects a referral value outside the controlled username contract", async () => {
    const response = await POST(
      request({ ...validBody, referral: "../../admin?role=admin" }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "INVALID_REFERRAL",
      fieldErrors: { referral: ["This referral link is not valid."] },
    });
  });
});
