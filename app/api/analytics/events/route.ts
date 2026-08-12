import { handleAnalyticsEventRequest } from "@/lib/analytics/http-ingestion";
import { ingestPublicAnalyticsEvent } from "@/lib/analytics/ingestion";

export async function POST(request: Request) {
  return handleAnalyticsEventRequest(request, ingestPublicAnalyticsEvent);
}
