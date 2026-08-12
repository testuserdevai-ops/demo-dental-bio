import Link from "next/link";

import { buttonVariants } from "@/app/components/ui/button";
import { OnboardingActionBar } from "@/app/onboarding/_components/OnboardingActionBar";
import {
  PROFILE_MODULE_IDS,
  PROFILE_TEMPLATE_CATALOG,
  PROFILE_THEME_CATALOG,
  type ProfileModuleId,
  type ProfileTemplateId,
  type ProfileThemeId,
} from "@/lib/profile-presentation/catalog";
import { cn } from "@/lib/utils";

type SummaryItem = { questionId: string; label: string; value: string };

const moduleLabels = Object.fromEntries(
  PROFILE_MODULE_IDS.map((id) => [
    id,
    id
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
  ]),
) as Record<ProfileModuleId, string>;

export function QuestionDraftReview({
  templateId,
  themeId,
  summary,
  moduleOrder,
  editHref,
}: {
  templateId: ProfileTemplateId;
  themeId: ProfileThemeId;
  summary: readonly SummaryItem[];
  moduleOrder: readonly ProfileModuleId[];
  editHref: string;
}) {
  return (
    <section aria-labelledby="draft-review-title">
      <p className="text-sm font-bold text-primary">Profile setup applied</p>
      <h1
        className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
        id="draft-review-title"
      >
        Review your profile plan
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
        Your selected template, colors, and completed setup answers are now
        applied to your public bio. Existing content and stable item IDs remain
        unchanged.
      </p>

      <dl className="mt-8 grid gap-4 rounded-[var(--radius-lg)] border border-border bg-card p-6 sm:grid-cols-2">
        <div>
          <dt className="text-sm font-semibold text-muted-foreground">
            Template
          </dt>
          <dd className="mt-1 font-bold text-card-foreground">
            {PROFILE_TEMPLATE_CATALOG[templateId].displayName}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-muted-foreground">
            Color theme
          </dt>
          <dd className="mt-1 font-bold text-card-foreground">
            {PROFILE_THEME_CATALOG[themeId].displayName}
          </dd>
        </div>
      </dl>

      <section className="mt-8" aria-labelledby="answer-summary-title">
        <h2 className="text-xl font-bold" id="answer-summary-title">
          Your choices
        </h2>
        {summary.length ? (
          <dl className="mt-4 divide-y divide-border overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
            {summary.map((item) => (
              <div className="p-5" key={item.questionId}>
                <dt className="text-sm font-semibold text-muted-foreground">
                  {item.label}
                </dt>
                <dd className="mt-1 font-medium text-card-foreground">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 text-muted-foreground">
            This template uses your existing profile content without extra
            answers.
          </p>
        )}
      </section>

      <section className="mt-8" aria-labelledby="module-order-title">
        <h2 className="text-xl font-bold" id="module-order-title">
          Planned profile order
        </h2>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2">
          {moduleOrder.map((moduleId, index) => (
            <li
              className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-card px-4 py-3"
              key={moduleId}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {index + 1}
              </span>
              <span className="font-medium text-card-foreground">
                {moduleLabels[moduleId]}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <OnboardingActionBar className="mt-8">
        <Link
          className={cn(buttonVariants({ variant: "ghost" }))}
          href={editHref}
        >
          Edit answers
        </Link>
        <Link className={cn(buttonVariants({ size: "lg" }))} href="/dashboard">
          Continue to dashboard
        </Link>
      </OnboardingActionBar>
    </section>
  );
}
