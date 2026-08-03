import type { ActionResult } from "@/lib/forms/action-result";

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
