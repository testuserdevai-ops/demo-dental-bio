import Link from "next/link";

import { OnboardingProgress } from "@/app/onboarding/_components/OnboardingProgress";
import { dashboardTargetHref } from "@/lib/dashboard/target";

export function QuestionFlowLocked({
  reason,
  targetUserId,
}: {
  reason: string;
  targetUserId?: string;
}) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <OnboardingProgress current={3} />
      <section className="mt-12 rounded-[var(--radius-lg)] border border-border bg-card p-8 text-center shadow-sm">
        <svg
          aria-hidden="true"
          className="mx-auto size-10 text-primary"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="M7 10V7a5 5 0 0 1 10 0v3m-9 0h8a2 2 0 0 1 2 2v7H6v-7a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.75"
          />
        </svg>
        <h1 className="mt-5 text-3xl font-bold text-card-foreground">
          Restart appearance setup to continue
        </h1>
        <p className="mx-auto mt-3 max-w-xl leading-7 text-muted-foreground">
          {reason} Your published profile and existing builder content have not
          changed.
        </p>
        <Link
          className="mt-7 inline-flex h-12 items-center justify-center rounded-[var(--radius-md)] bg-primary px-6 text-base font-bold text-primary-foreground transition-colors hover:bg-deep-purple focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          href={dashboardTargetHref(
            "/onboarding/appearance?step=theme",
            targetUserId,
          )}
        >
          Restart appearance setup
        </Link>
      </section>
    </main>
  );
}
