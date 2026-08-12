import {
  ArrowRight,
  CurrencyDollar,
  Megaphone,
  ShieldCheck,
  Ticket,
  Users,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { buttonVariants } from "@/app/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { getAdminOverviewMetrics } from "@/lib/admin/overview";
import { cn } from "@/lib/utils";

const metricDetails = [
  { key: "allUsers", label: "All users", description: "Registered accounts" },
  { key: "paidUsers", label: "Paid users", description: "Pro and Premium Pro" },
  {
    key: "verifiedProfiles",
    label: "Verified profiles",
    description: "Profiles with verification",
  },
  {
    key: "newUsersLast30Days",
    label: "New users",
    description: "Registered in the last 30 days",
  },
] as const;

const workspaces = [
  {
    href: "/admin/users",
    title: "Users",
    description:
      "Review accounts, manage access plans, verification, and announcements.",
    icon: Users,
  },
  {
    href: "/admin/paid-users",
    title: "Billing",
    description: "Inspect paid accounts, income, refunds, and payment history.",
    icon: CurrencyDollar,
  },
  {
    href: "/admin/security",
    title: "Security",
    description:
      "Investigate activity and manage blocked users, networks, and devices.",
    icon: ShieldCheck,
  },
  {
    href: "/admin/offer-codes",
    title: "Offer codes",
    description: "Create and maintain university eligibility codes.",
    icon: Ticket,
  },
  {
    href: "/admin/campaigns",
    title: "Campaigns",
    description:
      "Prepare audience lists and send controlled multi-brand email campaigns.",
    icon: Megaphone,
  },
] as const;

async function AccountMetrics() {
  const metrics = await loadAccountMetrics();
  if (!metrics) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertTitle>Account totals could not be loaded</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>The account database did not return a complete summary.</span>
          <Link
            href="/admin"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Try again
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  const isEmpty = metrics.allUsers === 0;
  return (
    <div className="space-y-4">
      {isEmpty && (
        <Alert>
          <AlertTitle>No accounts yet</AlertTitle>
          <AlertDescription>
            Account totals will appear here after the first user registers.
          </AlertDescription>
        </Alert>
      )}
      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricDetails.map(({ key, label, description }) => (
          <Card key={key}>
            <CardContent className="pt-6">
              <dt className="text-sm font-medium text-muted-foreground">
                {label}
              </dt>
              <dd className="mt-2 text-3xl font-bold tabular-nums">
                {metrics[key].toLocaleString()}
              </dd>
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
            </CardContent>
          </Card>
        ))}
      </dl>
    </div>
  );
}

async function loadAccountMetrics() {
  try {
    return await getAdminOverviewMetrics();
  } catch {
    return null;
  }
}

export function AdminOverview() {
  return (
    <div className="mx-auto max-w-7xl space-y-10 p-4 sm:p-8 lg:p-10">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-primary">
          Operations overview
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Account command center
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Monitor the current account base and move directly into the workspace
          that needs attention.
        </p>
      </header>

      <section aria-labelledby="account-summary-heading" className="space-y-4">
        <div>
          <h2 id="account-summary-heading" className="text-xl font-semibold">
            Account summary
          </h2>
          <p className="text-sm text-muted-foreground">
            Live totals from the account source of truth.
          </p>
        </div>
        <AccountMetrics />
      </section>

      <section aria-labelledby="workspaces-heading" className="space-y-4">
        <div>
          <h2 id="workspaces-heading" className="text-xl font-semibold">
            Workspaces
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose an operational area to continue.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspaces.map(({ href, title, description, icon: Icon }) => (
            <Card key={href} className="flex flex-col">
              <CardHeader>
                <div className="mb-2 flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-secondary text-secondary-foreground">
                  <Icon aria-hidden="true" className="size-6" />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto">
                <Link
                  href={href}
                  aria-label={`Open ${title} workspace`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full justify-between",
                  )}
                >
                  Open workspace
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
