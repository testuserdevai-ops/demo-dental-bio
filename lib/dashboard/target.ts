export function dashboardTargetHint(
  value: string | null | undefined,
): string | null {
  return value ?? null;
}

export function dashboardTargetHref(
  href: string,
  targetUserId: string | null | undefined,
): string {
  if (!targetUserId) return href;
  const url = new URL(href, "http://localhost");
  url.searchParams.set("userId", targetUserId);
  return `${url.pathname}${url.search}${url.hash}`;
}

export const DASHBOARD_TARGET_HEADER = "x-dashboard-target-user-id";

export function dashboardTargetHintFromSearchParams(
  searchParams: URLSearchParams,
): string | null {
  return dashboardTargetHint(searchParams.get("userId"));
}

export function dashboardTargetHintFromHeaders(
  headers: Headers,
): string | null {
  return dashboardTargetHint(headers.get(DASHBOARD_TARGET_HEADER));
}

export function dashboardTargetTransitionRequiresDocumentNavigation(
  initialTargetUserId: string | null,
  currentTargetUserId: string | null,
): boolean {
  return initialTargetUserId !== currentTargetUserId;
}

export function dashboardTargetHintFromUrl(
  value: string | null,
): string | null {
  if (!value) return null;
  try {
    return dashboardTargetHintFromSearchParams(
      new URL(value, "http://localhost").searchParams,
    );
  } catch {
    throw new Error("INVALID_TARGET_TRANSPORT");
  }
}
