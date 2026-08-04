"use client";
import type { LocationAggregate } from "./queries";
export async function fetchLocationAggregate(
  targetHint?: string,
): Promise<LocationAggregate> {
  const query = targetHint
    ? `?targetUserId=${encodeURIComponent(targetHint)}`
    : "";
  const response = await fetch(`/api/location${query}`);
  if (!response.ok) throw new Error("Unable to load locations");
  return response.json();
}
