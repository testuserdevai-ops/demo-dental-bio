import { createHmac } from "node:crypto";

import type { PublicActionDescriptor } from "./contract";

type EntityDimensions = {
  entityUuid: string | null;
  entityBigint: number | null;
  groupUuid: string | null;
  groupBigint: number | null;
  actionDimension: string | null;
};

function splitEntityId(value: string | number | undefined) {
  return typeof value === "string"
    ? { uuid: value, bigint: null }
    : { uuid: null, bigint: value ?? null };
}

export function getAnalyticsEntityDimensions(
  action: PublicActionDescriptor,
): EntityDimensions {
  let entity: string | number | undefined;
  let group: string | number | undefined;
  let actionDimension: string | null = null;

  switch (action.type) {
    case "profile_view":
      break;
    case "link_click":
      entity = action.linkId;
      group = action.groupId;
      break;
    case "blog_click":
      entity = action.blogId;
      group = action.groupId;
      break;
    case "video_open":
      entity = action.videoId;
      group = action.groupId;
      break;
    case "gallery_open":
      entity = action.galleryId;
      break;
    case "product_click":
      entity = action.productId;
      break;
    case "external_review_click":
      entity = action.reviewPageId;
      break;
    case "review_expand":
      entity = action.reviewId;
      break;
    case "treatment_expand":
    case "treatment_cta_click":
    case "service_expand":
    case "service_cta_click":
      entity = action.treatmentId;
      break;
    case "directions_click":
    case "map_open":
    case "location_select":
      entity = action.locationId;
      break;
    case "booking_click":
    case "email_click":
    case "phone_click":
      entity = action.locationId;
      break;
    case "cta_click":
      entity = action.locationId;
      actionDimension = action.ctaType;
      break;
    case "social_click":
      actionDimension = action.platform;
      break;
    case "share_click":
      actionDimension = action.channel;
      break;
    case "navigation_click":
      entity = action.locationId;
      actionDimension = action.destination;
      break;
    case "share_open":
    case "enquiry_start":
    case "enquiry_submit":
      break;
  }

  const entityParts = splitEntityId(entity);
  const groupParts = splitEntityId(group);
  return {
    entityUuid: entityParts.uuid,
    entityBigint: entityParts.bigint,
    groupUuid: groupParts.uuid,
    groupBigint: groupParts.bigint,
    actionDimension,
  };
}

export function hashAnalyticsIdentifier(
  namespace: "visitor" | "session" | "request",
  value: string,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(`${namespace}:${value}`)
    .digest("hex");
}
