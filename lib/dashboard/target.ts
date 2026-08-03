export function dashboardTargetHint(
  value: string | null | undefined,
): string | null {
  return value ?? null;
}

export function dashboardTargetHintFromUrl(
  value: string | null,
): string | null {
  if (!value) return null;
  try {
    return dashboardTargetHint(
      new URL(value, "http://localhost").searchParams.get("userId"),
    );
  } catch {
    return null;
  }
}
