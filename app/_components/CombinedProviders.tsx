"use client";

import type { ReactNode } from "react";
import { MessageProvider } from "@/app/contexts/MessageContext";
import { NavbarProvider } from "@/app/contexts/NavbarContext";
import { PreviewProvider } from "@/app/contexts/PreviewContext";

export function CombinedProviders({ children }: { children: ReactNode }) {
  return (
    <PreviewProvider>
      <NavbarProvider>
        <MessageProvider>{children}</MessageProvider>
      </NavbarProvider>
    </PreviewProvider>
  );
}
