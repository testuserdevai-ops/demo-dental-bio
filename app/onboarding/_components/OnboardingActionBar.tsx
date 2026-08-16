import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function OnboardingActionBar({
  children,
  className,
  desktopLayout = "inline",
  mobileLayout = "stacked",
}: {
  children: ReactNode;
  className?: string;
  desktopLayout?: "stacked" | "inline";
  mobileLayout?: "stacked" | "inline";
}) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/85 md:static md:mt-6 md:border-t md:bg-transparent md:px-0 md:pt-6 md:pb-0 md:shadow-none md:backdrop-blur-none",
        className,
      )}
      data-onboarding-action-bar
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-3xl gap-2 sm:flex-row sm:items-center sm:justify-between md:gap-3",
          mobileLayout === "inline"
            ? "flex-row items-center justify-between"
            : "flex-col-reverse",
          desktopLayout === "stacked"
            ? "lg:flex-col-reverse lg:items-stretch"
            : undefined,
        )}
      >
        {children}
      </div>
    </div>
  );
}
