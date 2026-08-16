import { ArrowsLeftRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { buttonVariants } from "@/app/components/ui/button-variants";
import { cn } from "@/lib/utils";

type DashboardSwitcherProps = {
  canSwitch: boolean;
  className?: string;
  destination: "admin" | "user";
};

const destinations = {
  admin: { href: "/admin", label: "Admin dashboard" },
  user: { href: "/dashboard", label: "User dashboard" },
} as const;

export function DashboardSwitcher({
  canSwitch,
  className,
  destination,
}: DashboardSwitcherProps) {
  if (!canSwitch) return null;

  const { href, label } = destinations[destination];

  return (
    <Link
      aria-label={`Switch to ${label}`}
      className={cn(
        buttonVariants({ size: "lg", variant: "outline" }),
        "min-h-11 rounded-full bg-card",
        className,
      )}
      data-analytics-exclusion="authenticated-dashboard-navigation"
      href={href}
    >
      <ArrowsLeftRight aria-hidden="true" className="size-5" />
      {label}
    </Link>
  );
}
