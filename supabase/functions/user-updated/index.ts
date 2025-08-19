// supabase/functions/user-updated/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

serve(async (req: Request) => {
  const authHeader = req.headers.get("authorization");
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (authHeader !== `Bearer ${secret}`) {
    console.error("Unauthorized request");
    return new Response("Unauthorized", {
      status: 401
    });
  }
  const body = await req.json();

  if (body.type === "UPDATE" && body.record.email_confirmed_at && body.old_record.email_confirmed_at === null) {
    // Extract user data (adjust path if needed based on actual webhook payload)
    const user = body.record; // fallback for different webhook shapes
    const meta = user.raw_user_meta_data || user;

    const {
      title,
      username,
      first_name,
      last_name,
      position,
      country,
      inviteUserName,
      trial_end,
      location,
    } = meta;
    const email = user.email;

    if (!username || !email) {
      console.error("Missing username or email");
      return new Response("Missing data", { status: 400 });
    }

    // Get user time and location server-side
    const now = new Date();
    const time = now.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });

    const trialEnd = new Date(trial_end);
    const today = new Date();
    const months = (trialEnd.getFullYear() - today.getFullYear()) * 12 + (trialEnd.getMonth() - today.getMonth());
    const remainingMonths = Math.max(0, months);

    // Prepare email data
    const emailData = {
      title,
      email,
      first_name,
      last_name,
      position,
      username,
      time,
      country: country || "Unknown",
      location: location || "Unknown",
      trialMonths: remainingMonths,
      inviteUserName,
    };

    // Send email using backend API
    try {
      const baseUrl = Deno.env.get("APP_BASE_URL");
      if (!baseUrl) {
        throw new Error("APP_BASE_URL not set in environment");
      }
      const sendResponse = await fetch(`${baseUrl}/api/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailData),
      });
      if (!sendResponse.ok) {
        const errorText = await sendResponse.text();
        console.error("Failed to send email:", sendResponse.status, errorText);
      } else {
        console.log("Email sent successfully");
      }
    } catch (err) {
      console.error("Error sending email:", err);
    }
  }

  return new Response("Webhook received and email data prepared", {
    status: 200
  });
});
