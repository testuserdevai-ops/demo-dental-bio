import "server-only";
import { Resend } from "resend";

let resend: Resend | undefined;
let resendApiKey: string | undefined;

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Email delivery is not configured. Set RESEND_API_KEY before sending email.",
    );
  }

  if (!resend || resendApiKey !== apiKey) {
    resend = new Resend(apiKey);
    resendApiKey = apiKey;
  }

  return resend;
}
