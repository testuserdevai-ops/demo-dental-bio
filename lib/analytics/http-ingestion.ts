import type { AnalyticsEvent } from "./contract";
import type { AnalyticsIngestionStatus } from "./ingestion";
import { evaluateAnalyticsRequest } from "./request-policy";

export const ANALYTICS_MAX_BODY_BYTES = 16_384;

type IngestEvent = (
  event: AnalyticsEvent,
  requestIdentity: string,
) => Promise<AnalyticsIngestionStatus>;

function json(value: unknown, status: number) {
  return Response.json(value, { status });
}

export async function handleAnalyticsEventRequest(
  request: Request,
  ingest: IngestEvent,
): Promise<Response> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > ANALYTICS_MAX_BODY_BYTES) {
    return json({ error: "Payload too large" }, 413);
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > ANALYTICS_MAX_BODY_BYTES) {
    return json({ error: "Payload too large" }, 413);
  }

  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const decision = evaluateAnalyticsRequest(value, request.headers);
  if (!decision.accepted) {
    return decision.reason === "invalid"
      ? json({ error: "Invalid event" }, 400)
      : new Response(null, { status: 204 });
  }

  try {
    const status = await ingest(decision.event, decision.requestIdentity);
    if (status === "rate_limited") {
      return json({ error: "Too many requests" }, 429);
    }
    return json(
      { eventId: decision.event.eventId, status },
      status === "accepted" ? 202 : 200,
    );
  } catch {
    return json({ error: "Event rejected" }, 422);
  }
}
