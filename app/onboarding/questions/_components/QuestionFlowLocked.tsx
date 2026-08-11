import Link from "next/link";
import { LockKeyIcon } from "@phosphor-icons/react/dist/ssr";

import { buttonVariants } from "@/app/components/ui/button";
import { OnboardingProgress } from "@/app/onboarding/_components/OnboardingProgress";
import { cn } from "@/lib/utils";

export function QuestionFlowLocked({ reason }: { reason: string }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <OnboardingProgress current={3} />
      <section className="mt-12 rounded-[var(--radius-lg)] border border-border bg-card p-8 text-center shadow-sm">
        <LockKeyIcon
          aria-hidden="true"
          className="mx-auto size-10 text-primary"
          weight="duotone"
        />
        <h1 className="mt-5 text-3xl font-bold text-card-foreground">
          Restart appearance setup to continue
        </h1>
        <p className="mx-auto mt-3 max-w-xl leading-7 text-muted-foreground">
          {reason} Your published profile and existing builder content have not
          changed.
        </p>
        <Link
          className={cn(buttonVariants({ size: "lg" }), "mt-7")}
          href="/onboarding/appearance?step=theme"
        >
          Restart appearance setup
        </Link>
      </section>
    </main>
  );
}
