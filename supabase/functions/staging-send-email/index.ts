import { Resend } from "npm:resend@6.0.2";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

interface SendEmailHookPayload {
  user: {
    email?: string;
    new_email?: string;
  };
  email_data: {
    action_type: string;
    redirect_to: string;
    site_url: string;
    token: string;
    token_hash: string;
    token_new: string;
    token_hash_new: string;
  };
}

const STAGING_RECIPIENT = "rameznoshy@gmail.com";

function requiredEnvironment(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    if (requiredEnvironment("APP_ENV") !== "staging") {
      throw new Error("This function is restricted to staging.");
    }
    if (requiredEnvironment("EMAIL_REDIRECT_TO") !== STAGING_RECIPIENT) {
      throw new Error("Staging email redirect is misconfigured.");
    }

    const rawBody = await request.text();
    const hookSecret = requiredEnvironment("SEND_EMAIL_HOOK_SECRET").replace(
      /^(v1,whsec_|whsec_)/,
      "",
    );
    const payload = new Webhook(hookSecret).verify(rawBody, {
      "webhook-id": request.headers.get("webhook-id") ?? "",
      "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
      "webhook-signature": request.headers.get("webhook-signature") ?? "",
    }) as SendEmailHookPayload;

    const intendedRecipients = [payload.user.email, payload.user.new_email]
      .filter(Boolean)
      .join(", ");
    const data = payload.email_data;
    const details = [
      ["Action", data.action_type],
      ["Intended recipient", intendedRecipients || "none"],
      ["Site URL", data.site_url],
      ["Redirect URL", data.redirect_to],
      ["Token", data.token],
      ["Token hash", data.token_hash],
      ["New token", data.token_new],
      ["New token hash", data.token_hash_new],
    ];
    const text = details
      .map(([label, value]) => `${label}: ${value || "none"}`)
      .join("\n");
    const html = `<h1>Staging authentication email</h1><dl>${details
      .map(
        ([label, value]) =>
          `<dt><strong>${escapeHtml(label)}</strong></dt><dd>${escapeHtml(value || "none")}</dd>`,
      )
      .join("")}</dl>`;

    const { error } = await new Resend(
      requiredEnvironment("RESEND_API_KEY"),
    ).emails.send({
      from: requiredEnvironment("RESEND_FROM_EMAIL"),
      to: STAGING_RECIPIENT,
      subject: `[STAGING] DentalBio ${data.action_type}`,
      text,
      html,
    });
    if (error) throw error;

    return new Response(JSON.stringify({}), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Staging auth email hook rejected the request", error);
    return new Response(JSON.stringify({ error: "Email hook rejected" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
});
