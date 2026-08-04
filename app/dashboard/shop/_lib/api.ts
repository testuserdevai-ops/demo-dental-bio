"use client";
import type { ProductAggregate } from "./queries";
export async function fetchProductAggregate(
  targetHint?: string,
): Promise<ProductAggregate> {
  const query = targetHint
    ? `?targetUserId=${encodeURIComponent(targetHint)}`
    : "";
  const response = await fetch(`/api/individual-products${query}`);
  if (!response.ok) throw new Error("Unable to load products");
  return response.json();
}
