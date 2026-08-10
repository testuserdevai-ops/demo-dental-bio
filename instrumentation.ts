import * as Sentry from "@sentry/nextjs";

import { assertStagingEnvironmentSafety } from "./lib/environment/server-policy";

export async function register() {
  assertStagingEnvironmentSafety();

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
