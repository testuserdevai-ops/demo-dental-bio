import { redirect } from "next/navigation";

import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import {
  PROFILE_TEMPLATE_IDS,
  type ProfileTemplateId,
} from "@/lib/profile-presentation/catalog";
import { getQuestionContentOptions } from "@/lib/profile-presentation/questions/content-options";
import {
  getProfileQuestionSet,
  getVisibleProfileQuestions,
} from "@/lib/profile-presentation/questions/registry";
import { getProfilePresentationState } from "@/lib/profile-presentation/repository";
import { getProfileOnboardingProgress } from "@/lib/profile-presentation/onboarding-progress";
import { getProfileViewModel } from "@/app/dashboard/_lib/profile/queries";
import { getLinkAggregate } from "@/app/dashboard/links/_lib/queries";
import { getVideoAggregate } from "@/app/dashboard/video/_lib/queries";

import { QuestionFlowLocked } from "./_components/QuestionFlowLocked";
import { TemplateQuestionFlow } from "./_components/TemplateQuestionFlow";

function isTemplateId(value: string | undefined): value is ProfileTemplateId {
  return PROFILE_TEMPLATE_IDS.includes(value as ProfileTemplateId);
}

export default async function TemplateQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    template?: string;
    step?: string;
    notice?: string;
    revision?: string;
  }>;
}) {
  let identity: Awaited<ReturnType<typeof resolveDashboardIdentity>>;
  try {
    identity = await resolveDashboardIdentity();
  } catch {
    redirect("/login");
  }

  const [params, state] = await Promise.all([
    searchParams,
    getProfilePresentationState(identity.scope.effectiveUserId),
  ]);
  if (state.draft.resolutionReason === "missing") {
    redirect("/onboarding/appearance?step=theme");
  }
  if (
    state.draft.resolutionReason === "malformed" ||
    state.draft.resolutionReason === "unsupported-version"
  ) {
    return (
      <QuestionFlowLocked
        reason={
          state.draft.resolutionReason === "unsupported-version"
            ? "This draft uses a newer unsupported configuration version."
            : "This saved appearance draft could not be read safely."
        }
      />
    );
  }

  const configuration = state.draft.effective;
  if (
    !isTemplateId(params.template) ||
    params.template !== configuration.templateId
  ) {
    redirect(
      `/onboarding/questions?template=${configuration.templateId}&notice=selection-updated`,
    );
  }

  const [contentOptions, profile, links, videos, progress] = await Promise.all([
    getQuestionContentOptions(identity.scope),
    getProfileViewModel(identity.scope),
    getLinkAggregate(identity.scope),
    getVideoAggregate(identity.scope),
    getProfileOnboardingProgress(
      identity.scope.effectiveUserId,
      configuration.templateId,
    ),
  ]);
  const answers = configuration.answers as Record<string, unknown>;
  const questions = getVisibleProfileQuestions(
    configuration.templateId,
    answers,
  );
  const firstStep = questions[0]?.id ?? "review";
  const step = params.step ?? firstStep;
  const validStep =
    step === "review" || questions.some(({ id }) => id === step);
  if (!validStep) {
    redirect(
      `/onboarding/questions?template=${configuration.templateId}&step=${firstStep}`,
    );
  }

  const fallbackNotice =
    state.draft.resolutionReason === "entitlement-fallback"
      ? "A saved paid appearance is not available on the current plan, so questions use the safe available theme and layout. The saved intent has not been published or deleted."
      : params.notice === "selection-updated"
        ? `The saved ${getProfileQuestionSet(configuration.templateId).title.toLowerCase()} is authoritative, so this page was updated to match it.`
        : undefined;

  return (
    <TemplateQuestionFlow
      builderContext={{
        scopeId: identity.scope.effectiveUserId,
        userId: identity.scope.effectiveUserId,
        profile,
        links,
        videos,
      }}
      key={`${configuration.templateId}-${state.draft.revision}-${step}`}
      contentOptions={contentOptions}
      fallbackNotice={fallbackNotice}
      initialAnswers={answers}
      initialCompletedStepIds={progress.completedStepIds}
      initialRevision={state.draft.revision}
      initialStep={step}
      templateId={configuration.templateId}
      themeId={configuration.themeId}
    />
  );
}
