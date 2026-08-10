import { expect, mock, test } from "bun:test";

const emailSend = mock(async (payload: unknown) => ({ data: payload }));
const batchSend = mock(async (payload: unknown) => ({ data: payload }));

mock.module("server-only", () => ({}));
mock.module("resend", () => ({
  Resend: class {
    emails = { send: emailSend };
    batch = { send: batchSend };
  },
}));

const { applyEmailDeliveryPolicy, sendEmail, sendEmailBatch } =
  await import("./resendClient");

const stagingEnvironment = {
  EMAIL_DELIVERY_MODE: "redirect",
  EMAIL_REDIRECT_TO: "rameznoshy@gmail.com",
  EMAIL_SUBJECT_PREFIX: "[STAGING]",
};

test("redirects every recipient and records the intended destinations", () => {
  const result = applyEmailDeliveryPolicy(
    {
      from: "DentalBio <noreply@dental.bio>",
      to: ["owner@example.com", "second@example.com"],
      cc: "copy@example.com",
      bcc: "blind@example.com",
      subject: "Welcome",
      html: "<p>Hello</p>",
      headers: {
        "List-Unsubscribe": "<https://production.example/unsubscribe>",
        "X-Campaign": "welcome",
      },
    },
    stagingEnvironment,
  );

  expect(result.to).toBe("rameznoshy@gmail.com");
  expect(result.cc).toBeUndefined();
  expect(result.bcc).toBeUndefined();
  expect(result.subject).toBe("[STAGING] Welcome");
  expect(result.html).toContain(
    "owner@example.com, second@example.com, copy@example.com, blind@example.com",
  );
  expect(result.headers).toEqual({ "X-Campaign": "welcome" });
});

test("keeps production delivery unchanged", () => {
  const payload = {
    from: "DentalBio <noreply@dental.bio>",
    to: "owner@example.com",
    subject: "Welcome",
    text: "Hello",
  };

  expect(applyEmailDeliveryPolicy(payload, {})).toBe(payload);
});

test("all single and batch sends pass through the redirect policy", async () => {
  process.env.RESEND_API_KEY = "re_staging";
  process.env.EMAIL_DELIVERY_MODE = "redirect";
  process.env.EMAIL_REDIRECT_TO = "rameznoshy@gmail.com";
  process.env.EMAIL_SUBJECT_PREFIX = "[STAGING]";

  await sendEmail({
    from: "DentalBio <noreply@dental.bio>",
    to: "single@example.com",
    subject: "Single",
    text: "Single body",
  });
  await sendEmailBatch([
    {
      from: "DentalBio <noreply@dental.bio>",
      to: "batch@example.com",
      subject: "Batch",
      text: "Batch body",
    },
  ]);

  expect(emailSend.mock.calls[0]?.[0]).toMatchObject({
    to: "rameznoshy@gmail.com",
    subject: "[STAGING] Single",
  });
  expect(batchSend.mock.calls[0]?.[0]).toEqual([
    expect.objectContaining({
      to: "rameznoshy@gmail.com",
      subject: "[STAGING] Batch",
    }),
  ]);
});
