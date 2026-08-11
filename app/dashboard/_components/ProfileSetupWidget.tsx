import Link from "next/link";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  PaletteIcon,
} from "@phosphor-icons/react/dist/ssr";

import { buttonVariants } from "@/app/components/ui/button";
import {
  PROFILE_TEMPLATE_CATALOG,
  type ProfileTemplateId,
} from "@/lib/profile-presentation/catalog";
import { getProfileQuestionSet } from "@/lib/profile-presentation/questions/registry";
import { cn } from "@/lib/utils";

export default function ProfileSetupWidget({
  completedStepIds,
  hasAppearanceDraft,
  templateId,
}: {
  completedStepIds: readonly string[];
  hasAppearanceDraft: boolean;
  templateId: ProfileTemplateId;
}) {
  const template = PROFILE_TEMPLATE_CATALOG[templateId];
  const steps = getProfileQuestionSet(templateId).questions.filter(
    ({ kind }) => kind === "content-builder",
  );
  const completed = new Set(completedStepIds);
  const completedCount = steps.filter(({ id }) => completed.has(id)).length;
  const firstIncomplete = steps.find(({ id }) => !completed.has(id));
  const isComplete = hasAppearanceDraft && !firstIncomplete;
  const progress = steps.length
    ? Math.round((completedCount / steps.length) * 100)
    : 100;
  const continueHref = !hasAppearanceDraft
    ? "/onboarding/appearance?step=theme"
    : firstIncomplete
      ? `/onboarding/questions?template=${templateId}&step=${firstIncomplete.id}`
      : `/onboarding/questions?template=${templateId}&step=review`;

  return (
    <section
      aria-labelledby="profile-setup-heading"
      className="rounded-2xl border border-grey-300 bg-white p-5 shadow-sm"
      data-testid="profile-setup-widget"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-primary">
            Profile appearance
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2
              className="text-xl font-semibold text-dark"
              id="profile-setup-heading"
            >
              {template.displayName}
            </h2>
            {isComplete ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-dark">
                <CheckCircleIcon aria-hidden="true" className="size-4" />
                Setup complete
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-grey-700">
            {isComplete
              ? "Your setup walkthrough is complete. You can revisit it or change your template at any time."
              : `${completedCount} of ${steps.length} setup steps completed. Continue where you left off or change the template.`}
          </p>
          <div
            aria-label={`${progress}% of profile setup complete`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress}
            className="mt-4 h-2 overflow-hidden rounded-full bg-grey-200"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:min-w-44">
          <Link
            className={cn(buttonVariants(), "min-h-11")}
            href={continueHref}
          >
            {isComplete ? "Review setup" : "Continue setup"}
            <ArrowRightIcon aria-hidden="true" />
          </Link>
          <Link
            className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
            href="/onboarding/appearance?step=template"
          >
            <PaletteIcon aria-hidden="true" /> Change template
          </Link>
        </div>
      </div>
    </section>
  );
}
