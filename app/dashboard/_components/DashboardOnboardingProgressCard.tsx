import Link from "next/link";
import { ArrowRightIcon, PaletteIcon } from "@phosphor-icons/react/dist/ssr";

import { buttonVariants } from "@/app/components/ui/button-variants";
import {
  PROFILE_TEMPLATE_CATALOG,
  type ProfileTemplateId,
} from "@/lib/profile-presentation/catalog";
import { getProfileQuestionSet } from "@/lib/profile-presentation/questions/registry";
import { dashboardTargetHref } from "@/lib/dashboard/target";
import { cn } from "@/lib/utils";

export type DashboardOnboardingProgress = {
  completedStepIds: readonly string[];
  hasAppearanceDraft: boolean;
  templateId: ProfileTemplateId;
};

export function resolveDashboardOnboardingProgress(
  value: DashboardOnboardingProgress,
) {
  const steps = getProfileQuestionSet(value.templateId).questions.filter(
    ({ kind }) => kind === "content-builder",
  );
  const completed = new Set(value.completedStepIds);
  const completedContentCount = steps.filter(({ id }) =>
    completed.has(id),
  ).length;
  const completedAppearanceCount = value.hasAppearanceDraft ? 1 : 0;
  const completedCount = completedContentCount + completedAppearanceCount;
  const firstIncomplete = steps.find(({ id }) => !completed.has(id));
  const totalCount = steps.length + 1;
  const remainingCount = totalCount - completedCount;
  const percentage = totalCount
    ? Math.round((completedCount / totalCount) * 100)
    : 100;
  const continueHref = !value.hasAppearanceDraft
    ? "/onboarding/appearance?step=theme"
    : firstIncomplete
      ? `/onboarding/questions?template=${value.templateId}&step=${firstIncomplete.id}`
      : `/onboarding/questions?template=${value.templateId}&step=review`;

  return {
    completedCount,
    continueHref,
    percentage,
    remainingCount,
    totalCount,
  };
}

export default function DashboardOnboardingProgressCard({
  className,
  progress,
  targetUserId,
}: {
  className?: string;
  progress: DashboardOnboardingProgress;
  targetUserId?: string | null;
}) {
  const resolved = resolveDashboardOnboardingProgress(progress);
  const isComplete = resolved.remainingCount === 0;
  const templateName =
    PROFILE_TEMPLATE_CATALOG[progress.templateId].displayName;

  return (
    <section
      aria-label="Profile setup progress"
      className={cn(
        "rounded-[24px] border border-grey-300 bg-white p-5 shadow-sm",
        className,
      )}
      data-analytics-exclusion="authenticated-dashboard-navigation"
      data-testid="dashboard-onboarding-progress"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
            Profile progress
          </p>
          <h2 className="mt-1 text-xl font-bold leading-tight text-dark">
            {resolved.percentage}% complete
          </h2>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
          {templateName}
        </span>
      </div>

      <div
        aria-label={`${resolved.percentage}% of profile setup complete`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={resolved.percentage}
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-grey-200"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
          style={{ width: `${resolved.percentage}%` }}
        />
      </div>

      <p className="mt-3 text-sm leading-5 text-grey-700">
        {isComplete
          ? "Your profile setup is complete. Keep it fresh as your practice changes."
          : `${resolved.remainingCount} ${resolved.remainingCount === 1 ? "step" : "steps"} remaining. Add a little more to help patients understand and contact you.`}
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xxl:grid-cols-1">
        <Link
          className={cn(buttonVariants(), "min-h-11 justify-between")}
          href={dashboardTargetHref(resolved.continueHref, targetUserId)}
        >
          {isComplete ? "Review profile setup" : "Continue profile setup"}
          <ArrowRightIcon aria-hidden="true" />
        </Link>
        <Link
          className={cn(
            buttonVariants({ variant: "outline" }),
            "min-h-11 justify-center",
          )}
          href={dashboardTargetHref(
            "/onboarding/appearance?step=theme",
            targetUserId,
          )}
        >
          <PaletteIcon aria-hidden="true" /> Update template or colors
        </Link>
      </div>
    </section>
  );
}
