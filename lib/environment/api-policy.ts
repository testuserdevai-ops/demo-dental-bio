import { NextResponse } from "next/server";

import { type ExternalMutationProvider, isStagingEnvironment } from "./policy";

export function stagingMutationBlockedResponse(
  provider: ExternalMutationProvider,
): NextResponse | null {
  if (!isStagingEnvironment()) return null;

  return NextResponse.json(
    {
      error: `${provider} mutations are disabled in the staging environment.`,
      code: "STAGING_EXTERNAL_MUTATION_BLOCKED",
    },
    { status: 403 },
  );
}
