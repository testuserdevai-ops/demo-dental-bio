"use client";

import {
  ChartLineUp,
  CurrencyDollar,
  House,
  Megaphone,
  ShieldCheck,
  Ticket,
  Users,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";

type AdminNavigationProps = { role: "admin" | "security_admin" };

const adminDestinations = [
  { href: "/admin", label: "Overview", icon: ChartLineUp, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/paid-users", label: "Billing", icon: CurrencyDollar },
  { href: "/admin/security", label: "Security", icon: ShieldCheck },
  { href: "/admin/offer-codes", label: "Offer codes", icon: Ticket },
  { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
] as const;

export function AdminNavigation({ role }: AdminNavigationProps) {
  const pathname = usePathname();
  const destinations =
    role === "security_admin"
      ? adminDestinations.filter(({ href }) => href === "/admin/security")
      : adminDestinations;

  return (
    <aside className="border-b border-border bg-card lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:flex-none lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col gap-5 p-4 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Operations
          </p>
          <p className="mt-1 text-xl font-bold">Admin console</p>
        </div>

        <nav aria-label="Admin workspaces" className="min-w-0">
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {destinations.map(({ href, label, icon: Icon, ...destination }) => {
              const current =
                "exact" in destination && destination.exact
                  ? pathname === href
                  : pathname.startsWith(href);
              return (
                <li key={href} className="shrink-0 lg:shrink">
                  <Link
                    aria-current={current ? "page" : undefined}
                    href={href}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      current
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-5 shrink-0" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <Link
          href="/dashboard"
          aria-label="Return to product dashboard"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "mt-auto hidden lg:flex",
          )}
        >
          <House aria-hidden="true" className="size-5" />
          Product dashboard
        </Link>
        <Link
          href="/dashboard"
          aria-label="Return to product dashboard"
          className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] px-3 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        >
          <House aria-hidden="true" className="size-5" />
          Product dashboard
        </Link>
      </div>
    </aside>
  );
}
