import type { PlatformFunnelModel } from "@/lib/admin/platform-funnel";
import { getAllBrands } from "@/utils/domainConfig";

function formatPercent(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 10) / 10}%`;
}

function formatElapsed(minutes: number | null) {
  if (minutes === null) return "Elapsed time unavailable";
  if (minutes < 60) return `${Math.round(minutes)} min median`;
  if (minutes < 1_440) {
    return `${Math.round((minutes / 60) * 10) / 10} hr median`;
  }
  return `${Math.round((minutes / 1_440) * 10) / 10} days median`;
}

function RateBar({ rate }: { rate: number | null }) {
  const width = rate === null ? 0 : Math.max(0, Math.min(100, rate));
  return (
    <div
      aria-label={
        rate === null ? "Rate unavailable" : `${formatPercent(rate)} of cohort`
      }
      className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200"
      role="img"
    >
      <div
        className="h-full rounded-full bg-indigo-600"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function PlatformFunnel({ data }: { data: PlatformFunnelModel }) {
  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-700">
            Platform owner analytics
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
            Signup and activation funnel
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Follow a registration cohort through authoritative account,
            onboarding, publication, and first-party profile engagement stages.
          </p>
        </div>

        <form className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-6">
          <label className="text-sm font-semibold text-gray-700">
            Registered from
            <input
              className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3"
              defaultValue={data.filters.startDate}
              max={data.filters.endDate}
              name="start"
              type="date"
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Registered to
            <input
              className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3"
              defaultValue={data.filters.endDate}
              min={data.filters.startDate}
              name="end"
              type="date"
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Plan now
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
            Domain now
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
          <label className="text-sm font-semibold text-gray-700">
            Signup cohort
            <select
              className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3"
              defaultValue={data.filters.cohort}
              name="cohort"
            >
              <option value="all">All known</option>
              <option value="organic">Organic ledger</option>
              <option value="referred">Referred ledger</option>
            </select>
          </label>
          <button
            className="min-h-11 self-end rounded-lg bg-indigo-700 px-4 font-semibold text-white hover:bg-indigo-800"
            type="submit"
          >
            Apply
          </button>
        </form>
      </div>

      <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
        The default range includes all DentalBio users. Dates select users by
        UTC registration date. Plan and domain are current attributes, not
        historical snapshots. Organic and referred filters only include accounts
        covered by the registration ledger.
      </div>

      <section aria-labelledby="funnel-heading" className="mt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-950" id="funnel-heading">
              Authoritative stage chain
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {data.cohortSize.toLocaleString()} registered owner
              {data.cohortSize === 1 ? "" : "s"} in this cohort. Each later
              stage requires every earlier stage.
            </p>
          </div>
          <p className="text-xs text-gray-500">
            Times and event dates use UTC.
          </p>
        </div>

        <ol className="mt-4 grid gap-3 lg:grid-cols-3 2xl:grid-cols-6">
          {data.stages.map((stage, index) => (
            <li
              className="relative rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              key={stage.id}
            >
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">
                Stage {index + 1}
              </p>
              <h3 className="mt-2 text-sm font-semibold text-gray-700">
                {stage.label}
              </h3>
              <p className="mt-1 text-3xl font-bold tabular-nums text-gray-950">
                {stage.count.toLocaleString()}
              </p>
              <RateBar rate={stage.cohortRate} />
              <p className="mt-2 text-xs font-semibold text-gray-700">
                {formatPercent(stage.cohortRate)} of cohort
              </p>
              {index > 0 ? (
                <p className="mt-1 text-xs text-gray-500">
                  {formatPercent(stage.previousStageRate)} from previous stage
                </p>
              ) : null}
              <p className="mt-3 border-t border-gray-100 pt-3 text-xs leading-5 text-gray-500">
                {stage.elapsedDefinition === "registration_to_publish"
                  ? `Registration → publish: ${formatElapsed(stage.medianMinutesFromPrevious)}`
                  : formatElapsed(stage.medianMinutesFromPrevious)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-gray-950">
            Profile completion distribution
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Current completion against the required steps for each owner’s
            selected template. A skipped step counts as completed walkthrough
            progress.
          </p>
          <ul className="mt-5 space-y-4">
            {data.completionDistribution.map((bucket) => {
              const rate =
                data.cohortSize === 0
                  ? null
                  : (bucket.count / data.cohortSize) * 100;
              return (
                <li key={bucket.id}>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-semibold text-gray-700">
                      {bucket.label}
                    </span>
                    <span className="tabular-nums text-gray-600">
                      {bucket.count.toLocaleString()} · {formatPercent(rate)}
                    </span>
                  </div>
                  <RateBar rate={rate} />
                </li>
              );
            })}
          </ul>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold text-gray-600">
                Onboarding started
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-gray-950">
                {data.onboardingStarted.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold text-gray-600">
                Registration ledger coverage
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-gray-950">
                {data.registrationCoverage.completed.toLocaleString()} /{" "}
                {data.registrationCoverage.cohort.toLocaleString()}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-gray-950">
            Adoption and traffic gaps
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-xs font-semibold text-amber-900">
                Published with zero traffic
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-amber-950">
                {data.trafficGaps.zeroTraffic?.toLocaleString() ?? "—"}
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-900">
                Of {data.trafficGaps.zeroTrafficEligible.toLocaleString()}{" "}
                profiles published after collection began.
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-xs font-semibold text-amber-900">
                Viewed with no outbound action
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-amber-950">
                {data.trafficGaps.viewedNoAction.toLocaleString()}
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-900">
                Profiles with a qualified view but no later action.
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-gray-500">
            {data.trafficGaps.analyticsCoverageStartedAt
              ? `Traffic coverage starts ${new Date(data.trafficGaps.analyticsCoverageStartedAt).toLocaleString("en-GB")} UTC; earlier traffic is not inferred.`
              : "Traffic collection has no authoritative starting event yet, so zero traffic is unavailable rather than zero."}
          </p>

          <h3 className="mt-6 text-base font-bold text-gray-950">
            Current module adoption
          </h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {data.moduleAdoption.map((module) => (
              <li
                className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm"
                key={module.id}
              >
                <span className="font-semibold text-gray-700">
                  {module.label}
                </span>
                <span className="tabular-nums text-gray-600">
                  {module.count.toLocaleString()} · {formatPercent(module.rate)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section
        aria-labelledby="unavailable-heading"
        className="mt-8 rounded-2xl border border-gray-300 bg-gray-50 p-5 sm:p-6"
      >
        <h2
          className="text-xl font-bold text-gray-950"
          id="unavailable-heading"
        >
          Remaining measurement scope
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
          These metrics need new authoritative sources or reviewed privacy and
          export controls. They are not represented as zero.
        </p>
        <ul className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.unavailable.map((item) => (
            <li
              className="rounded-xl border border-gray-200 bg-white p-4"
              key={item.id}
            >
              <p className="text-sm font-bold text-gray-900">
                {item.id.replace(/_/g, " ")}
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-600">
                {item.reason}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
