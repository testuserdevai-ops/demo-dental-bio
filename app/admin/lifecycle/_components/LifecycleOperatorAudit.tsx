import type {
  LifecycleAuditFilters,
  LifecycleAuditModel,
} from "@/lib/admin/lifecycle-audit";

const campaignOptions = [
  ["all", "All campaigns"],
  ["incomplete_profile", "Incomplete profile"],
  ["first_value_milestone", "First-value milestone"],
  ["weekly_performance", "Weekly performance"],
  ["no_contact_action", "Viewed, no contact"],
  ["zero_traffic", "Zero traffic"],
] as const;

const outcomeOptions = [
  ["all", "All outcomes"],
  ["eligible", "Eligible"],
  ["claimed", "Claimed"],
  ["sent", "Sent"],
  ["delivered", "Delivered"],
  ["failed", "Failed"],
  ["suppressed", "Suppressed"],
  ["cancelled", "Cancelled"],
  ["cta_clicked", "CTA clicked"],
  ["resulting_step_completed", "Resulting step completed"],
  ["activated", "Activated"],
] as const;

const campaignLabels = Object.fromEntries(campaignOptions) as Record<
  string,
  string
>;
const outcomeLabels = Object.fromEntries(outcomeOptions) as Record<
  string,
  string
>;

type AuditState =
  | { kind: "idle" }
  | { kind: "unavailable" }
  | { kind: "ready"; data: LifecycleAuditModel };

function formatUtc(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function preferenceStatus(data: LifecycleAuditModel) {
  const { preferences } = data;
  if (preferences.permanentDeliveryFailureAt) {
    return {
      label: "Delivery blocked",
      detail: `Permanent provider failure recorded ${formatUtc(preferences.permanentDeliveryFailureAt)} UTC.`,
      tone: "border-red-200 bg-red-50 text-red-950",
    };
  }
  if (preferences.promotionalUnsubscribedAt) {
    return {
      label: "Unsubscribed",
      detail: `Marketing unsubscribe recorded ${formatUtc(preferences.promotionalUnsubscribedAt)} UTC.`,
      tone: "border-amber-200 bg-amber-50 text-amber-950",
    };
  }
  if (
    preferences.supportPausedUntil &&
    new Date(preferences.supportPausedUntil).getTime() > Date.now()
  ) {
    return {
      label: "Support pause active",
      detail: `Delivery is paused until ${formatUtc(preferences.supportPausedUntil)} UTC.`,
      tone: "border-amber-200 bg-amber-50 text-amber-950",
    };
  }
  if (!preferences.lifecycleEmailsEnabled) {
    return {
      label: "Lifecycle email disabled",
      detail: "The owner preference currently disables lifecycle email.",
      tone: "border-gray-300 bg-gray-50 text-gray-950",
    };
  }
  return {
    label: "Lifecycle email enabled",
    detail:
      "No preference-level delivery block is recorded. Campaign eligibility is still evaluated separately.",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-950",
  };
}

function AuditFilters({ filters }: { filters: LifecycleAuditFilters }) {
  return (
    <form className="mt-6 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-[minmax(18rem,2fr)_1fr_1fr_8rem_auto]">
      <label className="text-sm font-semibold text-gray-700">
        Owner ID
        <input
          aria-describedby="owner-id-help"
          aria-invalid={filters.invalidOwnerId || undefined}
          className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 font-mono text-sm"
          defaultValue={filters.ownerId ?? ""}
          name="owner"
          placeholder="00000000-0000-0000-0000-000000000000"
          required
        />
      </label>
      <label className="text-sm font-semibold text-gray-700">
        Campaign
        <select
          className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3"
          defaultValue={filters.campaign}
          name="campaign"
        >
          {campaignOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold text-gray-700">
        Outcome
        <select
          className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3"
          defaultValue={filters.outcome}
          name="outcome"
        >
          {outcomeOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold text-gray-700">
        Show
        <select
          className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3"
          defaultValue={String(filters.limit)}
          name="limit"
        >
          <option value="25">25 events</option>
          <option value="50">50 events</option>
          <option value="100">100 events</option>
        </select>
      </label>
      <button
        className="min-h-11 self-end rounded-lg bg-indigo-700 px-5 font-semibold text-white hover:bg-indigo-800"
        type="submit"
      >
        Inspect
      </button>
      <p
        className="text-xs leading-5 text-gray-500 md:col-span-2 xl:col-span-5"
        id="owner-id-help"
      >
        Use the internal owner UUID. This surface deliberately does not search,
        display, or put an email address or profile name in the URL.
      </p>
      {filters.invalidOwnerId ? (
        <p
          className="text-sm font-semibold text-red-700 md:col-span-2 xl:col-span-5"
          role="alert"
        >
          Enter a valid owner UUID.
        </p>
      ) : null}
    </form>
  );
}

function PreferenceCards({ data }: { data: LifecycleAuditModel }) {
  const status = preferenceStatus(data);
  const preferences = data.preferences;
  const cards = [
    [
      "Weekly summary",
      preferences.weeklySummaryEnabled ? "Enabled" : "Disabled",
    ],
    [
      "Milestone email",
      preferences.milestoneEmailsEnabled ? "Enabled" : "Disabled",
    ],
    ["Preference revision", preferences.revision.toLocaleString()],
    [
      "Preference updated",
      `${formatUtc(preferences.updatedAt)}${preferences.updatedAt ? " UTC" : ""}`,
    ],
  ] as const;
  return (
    <section aria-labelledby="delivery-policy-heading" className="mt-8">
      <h2
        className="text-xl font-bold text-gray-950"
        id="delivery-policy-heading"
      >
        Delivery policy
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div
          className={`rounded-2xl border p-4 sm:col-span-2 xl:col-span-1 ${status.tone}`}
        >
          <p className="text-sm font-bold">{status.label}</p>
          <p className="mt-1 text-xs leading-5">{status.detail}</p>
        </div>
        {cards.map(([label, value]) => (
          <div
            className="rounded-2xl border border-gray-200 bg-white p-4"
            key={label}
          >
            <p className="text-xs font-semibold text-gray-500">{label}</p>
            <p className="mt-1 text-sm font-bold text-gray-950">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LifecycleOperatorAudit({
  filters,
  state,
}: {
  filters: LifecycleAuditFilters;
  state: AuditState;
}) {
  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <p className="text-sm font-semibold text-indigo-700">
        Lifecycle operations
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
        Owner lifecycle audit
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
        Inspect authoritative delivery preferences and the latest lifecycle
        audit events for one owner. This is a read-only operator surface.
      </p>

      <AuditFilters filters={filters} />

      {state.kind === "idle" ? (
        <section className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-6">
          <h2 className="text-lg font-bold text-gray-950">Choose an owner</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Enter an internal owner UUID to load preferences and up to the
            latest 100 audit events.
          </p>
        </section>
      ) : null}

      {state.kind === "unavailable" ? (
        <section
          className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6"
          role="alert"
        >
          <h2 className="text-lg font-bold text-red-950">Audit unavailable</h2>
          <p className="mt-1 text-sm leading-6 text-red-900">
            The owner was not found, the lifecycle source rejected the request,
            or the source is temporarily unavailable. No status is inferred.
          </p>
        </section>
      ) : null}

      {state.kind === "ready" ? (
        <>
          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
            Showing controlled campaign, outcome, reason code, and UTC time
            only. Filters apply to the latest{" "}
            {state.data.fetchedEventCount.toLocaleString()} event
            {state.data.fetchedEventCount === 1 ? "" : "s"} returned from a
            maximum window of 100; an empty result is not proof that an event
            never occurred.
          </div>
          <PreferenceCards data={state.data} />
          <section aria-labelledby="audit-events-heading" className="mt-8">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2
                  className="text-xl font-bold text-gray-950"
                  id="audit-events-heading"
                >
                  Audit events
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {state.data.events.length.toLocaleString()} event
                  {state.data.events.length === 1 ? "" : "s"} match the current
                  display filters.
                </p>
              </div>
              <p className="break-all font-mono text-xs text-gray-500">
                Owner {state.data.ownerId}
              </p>
            </div>
            {state.data.events.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
                No event in the fetched window matches these filters.
              </div>
            ) : (
              <ol className="mt-4 space-y-3">
                {state.data.events.map((event) => (
                  <li
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                    key={event.id}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-950">
                          {campaignLabels[event.campaign]}
                        </p>
                        <p className="mt-1 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800">
                          {outcomeLabels[event.outcome]}
                        </p>
                      </div>
                      <time
                        className="text-xs font-semibold text-gray-600"
                        dateTime={event.occurredAt}
                      >
                        {formatUtc(event.occurredAt)} UTC
                      </time>
                    </div>
                    <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-600">
                      Reason:{" "}
                      <code className="break-all font-semibold text-gray-800">
                        {event.reasonCode ?? "not recorded"}
                      </code>
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}
