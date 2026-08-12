import type { AnalyticsEvent } from "./contract";
import type { AnalyticsIngestionStatus } from "./ingestion";
import { evaluateAnalyticsRequest } from "./request-policy";

export const ANALYTICS_MAX_BODY_BYTES = 16_384;
export const ANALYTICS_MAX_BATCH_SIZE = 25;

type IngestEvent = (
  event: AnalyticsEvent,
  requestIdentity: string,
) => Promise<AnalyticsIngestionStatus>;

function json(value: unknown, status: number) {
  return Response.json(value, { status });
}

type EventResult = {
  eventId?: string;
  status: AnalyticsIngestionStatus | "excluded" | "invalid" | "rejected";
};

async function handleOne(
  value: unknown,
  headers: Headers,
  ingest: IngestEvent,
): Promise<EventResult> {
  const decision = evaluateAnalyticsRequest(value, headers);
  if (!decision.accepted) {
    return {
      status: decision.reason === "invalid" ? "invalid" : "excluded",
    };
  }

  try {
    return {
      eventId: decision.event.eventId,
      status: await ingest(decision.event, decision.requestIdentity),
    };
  } catch {
    return { eventId: decision.event.eventId, status: "rejected" };
  }
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

  if (Array.isArray(value)) {
    if (value.length < 1 || value.length > ANALYTICS_MAX_BATCH_SIZE) {
      return json({ error: "Batch must contain between 1 and 25 events" }, 400);
    }

    const results: EventResult[] = [];
    for (const item of value) {
      results.push(await handleOne(item, request.headers, ingest));
    }
    return json({ results }, 207);
  }

  const result = await handleOne(value, request.headers, ingest);
  switch (result.status) {
    case "invalid":
      return json({ error: "Invalid event" }, 400);
    case "excluded":
      return new Response(null, { status: 204 });
    case "rate_limited":
      return json({ error: "Too many requests" }, 429);
    case "rejected":
      return json({ error: "Event rejected" }, 422);
    case "accepted":
      return json(result, 202);
    case "duplicate":
      return json(result, 200);
  }
}
