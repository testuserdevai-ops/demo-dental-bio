import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

import type { AnalyticsEvent } from "./contract";
import {
  getAnalyticsEntityDimensions,
  hashAnalyticsIdentifier,
} from "./storage-mapping";

export type AnalyticsIngestionStatus =
  "accepted" | "duplicate" | "rate_limited";

function getHashSecret(): string {
  const secret =
    process.env.ANALYTICS_HASH_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || secret.length < 16) {
    throw new Error("Analytics hashing secret is not configured");
  }
  return secret;
}

export async function ingestPublicAnalyticsEvent(
  event: AnalyticsEvent,
  requestIdentity: string,
): Promise<AnalyticsIngestionStatus> {
  const hasGrantedIdentifiers = event.consent === "granted";
  const secret = hasGrantedIdentifiers ? getHashSecret() : null;
  const dimensions = getAnalyticsEntityDimensions(event.action);
  const { data, error } = await supabaseAdmin.rpc(
    "ingest_public_analytics_event",
    {
      p_event_id: event.eventId,
      p_schema_version: event.schemaVersion,
      p_profile_id: event.profileId,
      p_occurred_at: event.occurredAt,
      p_action_type: event.action.type,
      p_section: event.section,
      p_visible_position: event.position ?? null,
      p_entity_uuid: dimensions.entityUuid,
      p_entity_bigint: dimensions.entityBigint,
      p_group_uuid: dimensions.groupUuid,
      p_group_bigint: dimensions.groupBigint,
      p_action_dimension: dimensions.actionDimension,
      p_consent_state: event.consent,
      p_referrer_domain: event.attribution?.referrerDomain ?? null,
      p_attribution_source: event.attribution?.source ?? null,
      p_utm_source: event.attribution?.utmSource ?? null,
      p_utm_medium: event.attribution?.utmMedium ?? null,
      p_utm_campaign: event.attribution?.utmCampaign ?? null,
      p_device_class: event.client?.deviceClass ?? "unknown",
      p_visitor_hash:
        hasGrantedIdentifiers && event.client?.anonymousVisitorId && secret
          ? hashAnalyticsIdentifier(
              "visitor",
              event.client.anonymousVisitorId,
              secret,
            )
          : null,
      p_session_hash:
        hasGrantedIdentifiers && event.client?.sessionId && secret
          ? hashAnalyticsIdentifier("session", event.client.sessionId, secret)
          : null,
      p_request_hash:
        hasGrantedIdentifiers && secret
          ? hashAnalyticsIdentifier("request", requestIdentity, secret)
          : null,
    } as never,
  );

  if (error) throw new Error("Analytics event was rejected by storage");
  const status = data?.[0]?.status;
  if (
    status !== "accepted" &&
    status !== "duplicate" &&
    status !== "rate_limited"
  ) {
    throw new Error("Analytics storage returned an invalid status");
  }
  return status;
}
