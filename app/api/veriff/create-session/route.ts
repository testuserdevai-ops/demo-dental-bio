import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import { saveVeriffSession } from "@/lib/dashboard/authority-write";

const VERIFF_API_URL = process.env.VERIFF_API_URL!;
const API_KEY = process.env.VERIFF_API_KEY!; // Veriff API Key

export const POST = withAuth(async (req, { user }) => {
  // Get domain-specific configuration
  const { getDomainConfig } = await import("@/utils/domainConfig");
  const domainConfig = getDomainConfig(req.headers);
  const baseUrl = domainConfig.baseUrl;

  if (!user.id) {
    return apiResponse.badRequest("You should login before verification.");
  }

  if (user.isVerified) {
    return apiResponse.badRequest("You already verified your identity.");
  }

  const response = await fetch(VERIFF_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AUTH-CLIENT": API_KEY,
    },
    body: JSON.stringify({
      verification: {
        callback: `${baseUrl}/dashboard/verification`,
        person: {
          firstName: user.first_name,
          lastName: user.last_name,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.statusText}`);
  }

  const data = await response.json();
  await saveVeriffSession(user.id, {
    sessionId: data.verification.id,
    sessionUrl: data.verification.url,
    createdAt: new Date().toISOString(),
  });

  return apiResponse.success(data);
});
