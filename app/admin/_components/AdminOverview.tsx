import { ArrowRight, FunnelSimple } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { buttonVariants } from "@/app/components/ui/button-variants";
import type { AdminOverview as AdminOverviewModel } from "@/lib/admin/overview";
import { cn } from "@/lib/utils";
import { getAllBrands } from "@/utils/domainConfig";

function formatChange(change: number | null) {
  if (change === null) return "New activity; no prior baseline";
  const rounded = Math.round(change * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}% vs previous period`;
}

function MetricCard({
  href,
  label,
  value,
  note,
}: {
  href: string;
  label: string;
  value: number | null;
  note: string;
}) {
  return (
    <Link
      className="rounded-2xl border border-gray-200 bg-white p-5 text-gray-950 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
      href={href}
    >
      <p className="text-sm font-semibold text-gray-600">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums">
        {value === null ? "—" : value.toLocaleString()}
      </p>
      <p className="mt-2 text-xs leading-5 text-gray-500">{note}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-700">
        Investigate
        <ArrowRight aria-hidden="true" size={14} weight="bold" />
      </span>
    </Link>
  );
}

export function AdminOverview({ data }: { data: AdminOverviewModel }) {
  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-700">
            Product and business health
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
            Operations overview
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Account growth, profile readiness, plan mix, and first-party profile
            engagement in one place.
          </p>
        </div>
        <form className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-4">
          <label className="text-sm font-semibold text-gray-700">
            Range
            <select
              className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3"
              defaultValue={String(data.filters.days)}
              name="days"
            >
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Plan
            <select
              className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3"
              defaultValue={data.filters.plan}
              name="plan"
            >
              <option value="all">All plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="premium">Premium</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Domain
            <select
              className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3"
              defaultValue={data.filters.domain}
              name="domain"
            >
              <option value="all">All domains</option>
              {getAllBrands().map((brand) => (
                <option key={brand.domain} value={brand.domain}>
                  {brand.domain}
                </option>
              ))}
            </select>
          </label>
          <button
            className={cn(
              buttonVariants({ size: "lg" }),
              "min-h-11 self-end rounded-lg",
            )}
            type="submit"
          >
            <FunnelSimple aria-hidden="true" size={18} weight="bold" />
            Apply
          </button>
        </form>
      </div>

      <p className="mt-5 text-xs text-gray-500">
        Data through {new Date(data.dataThrough).toLocaleString("en-GB")} · UTC
      </p>

      <section aria-labelledby="accounts-heading" className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2
              className="text-xl font-bold text-gray-950"
              id="accounts-heading"
            >
              Accounts and activation
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Ready means the account has a non-empty public profile title.
            </p>
          </div>
          <Link
            className="text-sm font-semibold text-indigo-700"
            href="/admin/users"
          >
            Investigate users
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            href="/admin/users"
            label="Total users"
            note="All registered owner records in the selected scope."
            value={data.users.total}
          />
          <MetricCard
            href={`/admin/users?createdWithin=${data.filters.days}`}
            label="New sign-ups"
            note={formatChange(data.users.signups.changePercent)}
            value={data.users.signups.value}
          />
          <MetricCard
            href="/admin/users?activeWithin=7"
            label="Active users · 7 days"
            note="Unavailable until authenticated product activity has an authoritative source."
            value={data.users.active7Days}
          />
          <MetricCard
            href="/admin/users?activeWithin=30"
            label="Active users · 30 days"
            note="Unavailable until authenticated product activity has an authoritative source."
            value={data.users.active30Days}
          />
          <MetricCard
            href="/admin/users?profileState=ready"
            label="Ready profiles"
            note="Profiles with owner-authored public title content."
            value={data.users.readyProfiles}
          />
          <MetricCard
            href="/admin/users?profileState=incomplete"
            label="Incomplete profiles"
            note="Accounts that still need basic public profile content."
            value={data.users.incompleteProfiles}
          />
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section
          aria-labelledby="plans-heading"
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 className="text-xl font-bold text-gray-950" id="plans-heading">
            Plan state
          </h2>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ["Free", data.plans.free],
              ["Active trial", data.plans.trial],
              ["Paid", data.plans.paid],
              ["Expired", data.plans.expired],
              ["Cancelled", data.plans.cancelled],
              ["Past due", data.plans.pastDue],
            ].map(([label, value]) => (
              <div className="rounded-xl bg-gray-50 p-4" key={String(label)}>
                <dt className="text-xs font-semibold text-gray-600">{label}</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-gray-950">
                  {value === null ? "—" : Number(value).toLocaleString()}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-5 text-gray-500">
            Cancelled and past-due remain unavailable until billing-provider
            reconciliation is authoritative; they are never shown as zero.
          </p>
        </section>

        <section
          aria-labelledby="engagement-heading"
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h2
            className="text-xl font-bold text-gray-950"
            id="engagement-heading"
          >
            Public profile engagement
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-indigo-50 p-4">
              <p className="text-xs font-semibold text-indigo-800">Views</p>
              <p className="mt-1 text-2xl font-bold text-indigo-950">
                {data.profileAnalytics.views?.value.toLocaleString() ?? "—"}
              </p>
            </div>
            <div className="rounded-xl bg-indigo-50 p-4">
              <p className="text-xs font-semibold text-indigo-800">
                Outbound actions
              </p>
              <p className="mt-1 text-2xl font-bold text-indigo-950">
                {data.profileAnalytics.outboundActions?.value.toLocaleString() ??
                  "—"}
              </p>
            </div>
          </div>
          {data.profileAnalytics.state === "available" ? (
            <>
              <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <caption className="sr-only">
                    Daily public profile engagement
                  </caption>
                  <thead className="bg-gray-50 text-xs text-gray-600">
                    <tr>
                      <th className="px-3 py-2 font-semibold">UTC date</th>
                      <th className="px-3 py-2 text-right font-semibold">
                        Views
                      </th>
                      <th className="px-3 py-2 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.profileAnalytics.trend.map((row) => (
                      <tr className="border-t border-gray-100" key={row.date}>
                        <th className="px-3 py-2 font-medium text-gray-700">
                          {row.date}
                        </th>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {row.views.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {row.outboundActions.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs leading-5 text-gray-500">
                Views and outbound actions use accepted first-party events in
                the selected scope. Privacy-safe unique visitors remain
                unavailable without an approved visitor identifier.
              </p>
            </>
          ) : (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              First-party aggregates are processing. This state intentionally
              avoids presenting collection gaps as zero engagement.
            </p>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-gray-950">Revenue</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold text-gray-600">MRR</p>
              <p className="mt-1 text-2xl font-bold text-gray-950">—</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold text-gray-600">
                Trial to paid
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-950">—</p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-gray-500">
            Billing metrics remain unavailable until provider reconciliation is
            authoritative and freshness can be reported.
          </p>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-gray-950">
            Operational attention
          </h2>
          <div
            className={`mt-5 rounded-xl border p-4 ${
              data.operations.analytics.state === "drift"
                ? "border-red-200 bg-red-50"
                : data.operations.analytics.state === "healthy"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-gray-950">
                First-party analytics pipeline
              </h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-gray-700">
                {data.operations.analytics.state}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Accepted events · 7d", data.operations.analytics.rawEvents],
                [
                  "Rolled-up events · 7d",
                  data.operations.analytics.aggregateEvents,
                ],
                ["Aggregate drift", data.operations.analytics.aggregateDrift],
                [
                  "Profiles with drift",
                  data.operations.analytics.profilesWithDrift,
                ],
              ].map(([label, value]) => (
                <div className="rounded-lg bg-white/80 p-3" key={String(label)}>
                  <dt className="text-xs font-semibold text-gray-600">
                    {label}
                  </dt>
                  <dd className="mt-1 text-xl font-bold tabular-nums text-gray-950">
                    {Number(value).toLocaleString()}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs leading-5 text-gray-600">
              {data.operations.analytics.latestReceivedAt
                ? `Latest accepted event ${new Date(
                    data.operations.analytics.latestReceivedAt,
                  ).toLocaleString("en-GB", { timeZone: "UTC" })} UTC.`
                : "No accepted event has reached the pipeline yet."}{" "}
              {data.operations.analytics.retentionOverage === 0
                ? "No raw events exceed the 400-day retention window."
                : `${data.operations.analytics.retentionOverage.toLocaleString()} raw events exceed the retention window.`}
            </p>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-3">
            {[
              ["Failed operations", data.operations.failedOperations],
              ["Pending reports", data.operations.pendingReports],
              ["Past SLA", data.operations.breachedSla],
            ].map(([label, value]) => (
              <div className="rounded-xl bg-gray-50 p-4" key={String(label)}>
                <dt className="text-xs font-semibold text-gray-600">{label}</dt>
                <dd className="mt-1 text-2xl font-bold text-gray-950">
                  {value === null ? "—" : Number(value).toLocaleString()}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-5 text-gray-500">
            No authoritative incident, report, or SLA feed is connected yet;
            missing feeds are not presented as zero incidents.
          </p>
        </section>
      </div>
    </main>
  );
}
