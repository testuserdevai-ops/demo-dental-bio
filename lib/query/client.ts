import { QueryClient } from "@tanstack/react-query";
import { DashboardNetworkError, DashboardQueryError } from "./errors";

export function shouldRetryDashboardQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (failureCount > 0) {
    return false;
  }

  if (error instanceof DashboardQueryError) {
    return error.status >= 500 && error.status <= 599;
  }

  return error instanceof DashboardNetworkError;
}

export function createDashboardQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        retry: shouldRetryDashboardQuery,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: true,
      },
      mutations: {
        retry: false,
        throwOnError: false,
      },
    },
  });
}
