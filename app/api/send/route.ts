import { NextResponse } from "next/server";
import { sendEmail } from "@/utils/mails/resendClient";

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "Unknown";

    const userAgent = req.headers.get("user-agent") || "Unknown";
    const referer = req.headers.get("referer") || "None";
    const origin = req.headers.get("origin") || "None";
    const acceptLanguage = req.headers.get("accept-language") || "Unknown";
    const contentType = req.headers.get("content-type") || "None";

    let body: string = "No body";
    try {
      const raw = await req.text();
      if (raw) body = raw;
    } catch {
      body = "Could not read body";
    }

    const timestamp = new Date().toISOString();

    await sendEmail({
      from: "API Monitor <noreply@dentalbio.com>",
      to: "sergey.r1130@gmail.com",
      subject: `API Call Detected - /api/send - ${timestamp}`,
      html: `
        <h2>Someone called POST /api/send</h2>
        <table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;">
          <tr style="background: #f4f4f4;">
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Timestamp</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${timestamp}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">IP Address</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${ip}</td>
          </tr>
          <tr style="background: #f4f4f4;">
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">User Agent</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${userAgent}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Referer</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${referer}</td>
          </tr>
          <tr style="background: #f4f4f4;">
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Origin</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${origin}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Accept-Language</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${acceptLanguage}</td>
          </tr>
          <tr style="background: #f4f4f4;">
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Content-Type</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${contentType}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Request Body</td>
            <td style="padding: 8px; border: 1px solid #ddd;"><pre style="margin:0; white-space: pre-wrap;">${body}</pre></td>
          </tr>
        </table>
      `,
    });

    return NextResponse.json({ message: "OK" }, { status: 200 });
  } catch (error) {
    console.error("Error in POST /api/send:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
