import Link from "next/link";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { readOwnerConversionGoals } from "@/lib/analytics/repository";
import { analyticsPlanFromSubscription } from "../_lib/repository";
import { PlanGate } from "../_components/PlanGate";
import { GoalForm } from "./_components/GoalForm";
import { GoalRow } from "./_components/GoalRow";
import { readConversionGoalEntityOptions } from "./_lib/repository";

export default async function AnalyticsGoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const { userId } = await searchParams;
  const identity = await resolveDashboardIdentity(userId);
  const plan = analyticsPlanFromSubscription(identity.shell.subscriptionStatus);

  if (plan === "free") {
    return (
      <div className="space-y-5 pb-12">
        <div>
          <Link
            href="/dashboard/analytics?tab=conversions"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
          >
            ← Back to conversions
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            Conversion goals
          </h1>
        </div>
        <PlanGate
          title="Configure conversion goals"
          description="Pro lets you choose controlled profile outcomes and report future matching events."
          targetUserId={userId}
        />
      </div>
    );
  }

  const [goals, options] = await Promise.all([
    readOwnerConversionGoals(identity.scope.effectiveUserId),
    readConversionGoalEntityOptions(
      identity.scope.dentistryId,
      identity.scope.effectiveUserId,
    ),
  ]);
  const analyticsHref = new URLSearchParams({ tab: "conversions" });
  if (userId) analyticsHref.set("userId", userId);

  return (
    <div className="min-w-0 space-y-5 pb-12">
      <header>
        <Link
          href={`/dashboard/analytics?${analyticsHref.toString()}`}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
        >
          ← Back to conversions
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Conversion goals
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">
          A conversion is an accepted event matching an enabled goal. Booking
          and product clicks remain clicks unless a verified integration later
          confirms the external outcome.
        </p>
      </header>

      <section aria-labelledby="goal-list-title" className="space-y-3">
        <h2 id="goal-list-title" className="text-lg font-semibold">
          Your goals
        </h2>
        {goals.map((goal) => (
          <GoalRow key={goal.goalId} goal={goal} targetHint={userId} />
        ))}
      </section>

      <GoalForm options={options} targetHint={userId} />

      <aside className="rounded-2xl border bg-muted/30 p-4 text-sm leading-5 text-muted-foreground">
        Campaign attribution uses the last non-direct DentalBio touch within the
        selected bounded window. Direct or unknown activity does not overwrite
        an eligible known touch. Cookie restrictions, missing consent, and
        cross-device visits can leave a conversion unattributed.
      </aside>
    </div>
  );
}
