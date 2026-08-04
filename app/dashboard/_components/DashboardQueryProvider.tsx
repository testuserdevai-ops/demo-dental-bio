"use client";

import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createDashboardQueryClient } from "@/lib/query/client";

export function DashboardQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [client] = React.useState(createDashboardQueryClient);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
