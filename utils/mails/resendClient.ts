import { Resend } from "resend";

let resend: Resend | undefined;

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Email delivery is not configured. Set RESEND_API_KEY before sending email.",
    );
  }

  resend ??= new Resend(apiKey);
  return resend;
}
