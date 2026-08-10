import "server-only";
import { Resend, type CreateEmailOptions } from "resend";

import type { EnvironmentVariables } from "@/lib/environment/policy";

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

function recipients(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function applyEmailDeliveryPolicy(
  payload: CreateEmailOptions,
  environment: EnvironmentVariables = process.env,
): CreateEmailOptions {
  if (environment.EMAIL_DELIVERY_MODE !== "redirect") return payload;

  const redirectTo = environment.EMAIL_REDIRECT_TO?.trim();
  if (!redirectTo) {
    throw new Error(
      "EMAIL_REDIRECT_TO is required when email delivery mode is redirect.",
    );
  }

  const intendedRecipients = [
    ...recipients(payload.to),
    ...recipients(payload.cc),
    ...recipients(payload.bcc),
  ];
  const intended = intendedRecipients.join(", ") || "none";
  const prefix = environment.EMAIL_SUBJECT_PREFIX?.trim() || "[STAGING]";
  const headers = Object.fromEntries(
    Object.entries(payload.headers ?? {}).filter(
      ([name]) =>
        name.toLowerCase() !== "list-unsubscribe" &&
        name.toLowerCase() !== "list-unsubscribe-post",
    ),
  );
  const noticeText = `STAGING REDIRECT\nIntended recipient(s): ${intended}\n\n`;
  const noticeHtml = `<div style="border: 2px solid #d97706; padding: 12px; margin-bottom: 20px;"><strong>STAGING REDIRECT</strong><br>Intended recipient(s): ${escapeHtml(intended)}</div>`;
  const { bcc: _bcc, cc: _cc, ...redirected } = payload;

  return {
    ...redirected,
    to: redirectTo,
    subject: `${prefix} ${payload.subject}`,
    ...(payload.text ? { text: `${noticeText}${payload.text}` } : {}),
    ...(payload.html ? { html: `${noticeHtml}${payload.html}` } : {}),
    ...(Object.keys(headers).length ? { headers } : { headers: undefined }),
  } as CreateEmailOptions;
}

export function sendEmail(payload: CreateEmailOptions) {
  return getResendClient().emails.send(applyEmailDeliveryPolicy(payload));
}

export function sendEmailBatch(payloads: CreateEmailOptions[]) {
  return getResendClient().batch.send(
    payloads.map((payload) => applyEmailDeliveryPolicy(payload)),
  );
}
