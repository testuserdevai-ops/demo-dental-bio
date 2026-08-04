import crypto from "crypto";
import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import { setUserVerification } from "@/lib/dashboard/authority-write";

const sharedSecret = process.env.VERIFF_SHARED_SECRET!;

export const GET = withAuth(async (request, { user }) => {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return apiResponse.badRequest("Session ID is required");
  }

  const apiKey = process.env.VERIFF_API_KEY;
  const apiUrl = `${process.env.VERIFF_API_URL}/${sessionId}/attempts`;

  if (!apiKey || !apiUrl) {
    return apiResponse.error(
      "API key or URL is not set in the environment variables",
      500,
    );
  }

  const hmac = crypto.createHmac("sha256", sharedSecret);
  hmac.update(sessionId);
  const signature = hmac.digest("hex");

  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      "X-AUTH-CLIENT": apiKey,
      "X-HMAC-SIGNATURE": signature,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch session status: ${response.statusText}`);
  }

  const data = await response.json();

  const verifications = data.verifications;
  let status = "declined";

  verifications.forEach((verification: any) => {
    if (verification.status === "pending") {
      status = "pending";
    }
  });

  verifications.forEach((verification: any) => {
    if (verification.status === "approved") {
      status = "approved";
    }
  });

  if (status === "approved") {
    await setUserVerification(user.id, true);
  }

  return apiResponse.success({ status });
});
