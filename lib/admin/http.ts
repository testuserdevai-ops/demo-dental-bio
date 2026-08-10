import "server-only";

import type { NextResponse } from "next/server";

import { withAuth, type AuthContext } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";

import {
  AdminAuthorizationError,
  authorizeAdminActor,
  type AdminCapability,
  type AuthorizedAdminActor,
} from "./authorization";

export type AdminAuthContext = AuthContext & {
  actor: AuthorizedAdminActor;
};

type AdminHandler = (
  request: Request,
  context: AdminAuthContext,
) => Promise<NextResponse>;

export function withAdminAuthorization(
  capability: AdminCapability,
  handler: AdminHandler,
) {
  return withAuth(async (request, context) => {
    try {
      const actor = authorizeAdminActor(
        {
          id: context.user.id,
          role: context.user.role,
          isBlocked: context.user.is_blocked,
        },
        capability,
      );

      return await handler(request, { ...context, actor });
    } catch (error) {
      if (error instanceof AdminAuthorizationError) {
        return apiResponse.forbidden();
      }
      throw error;
    }
  });
}
