import type { ActionResult } from "@/lib/forms/action-result";

export class DashboardNetworkError extends Error {
  constructor(message = "Network request failed") {
    super(message);
    this.name = "DashboardNetworkError";
  }
}

export class DashboardQueryError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly result?: ActionResult<never>,
  ) {
    super(message);
    this.name = "DashboardQueryError";
  }
}
