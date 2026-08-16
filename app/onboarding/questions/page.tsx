import { redirect } from "next/navigation";

import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { dashboardTargetHref } from "@/lib/dashboard/target";
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
    userId?: string;
  }>;
}) {
  const params = await searchParams;
  let identity: Awaited<ReturnType<typeof resolveDashboardIdentity>>;
  try {
    identity = await resolveDashboardIdentity(params.userId);
  } catch {
    redirect("/login");
  }

  const state = await getProfilePresentationState(
    identity.scope.effectiveUserId,
  );
  if (state.draft.resolutionReason === "missing") {
    redirect(
      dashboardTargetHref("/onboarding/appearance?step=theme", params.userId),
    );
  }
  if (
    state.draft.resolutionReason === "malformed" ||
    state.draft.resolutionReason === "unsupported-version"
  ) {
    return (
      <QuestionFlowLocked
        targetUserId={params.userId}
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
      dashboardTargetHref(
        `/onboarding/questions?template=${configuration.templateId}&notice=selection-updated`,
        params.userId,
      ),
    );
  }

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
      dashboardTargetHref(
        `/onboarding/questions?template=${configuration.templateId}&step=${firstStep}`,
        params.userId,
      ),
    );
  }

  const needsContentOptions = questions.some(
    ({ kind }) => kind === "entity-single" || kind === "entity-multiple",
  );
  const [contentOptions, progress] = await Promise.all([
    needsContentOptions
      ? getQuestionContentOptions(identity.scope)
      : Promise.resolve({
          treatments: [],
          locations: [],
          reviews: [],
          galleries: [],
          links: [],
          products: [],
        }),
    getProfileOnboardingProgress(
      identity.scope.effectiveUserId,
      configuration.templateId,
    ),
  ]);

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
        targetHint: params.userId,
      }}
      key={configuration.templateId}
      contentOptions={contentOptions}
      fallbackNotice={fallbackNotice}
      initialAnswers={answers}
      initialCompletedStepIds={progress.completedStepIds}
      initialRevision={state.draft.revision}
      initialStep={step}
      templateId={configuration.templateId}
      themeId={configuration.themeId}
      targetUserId={params.userId}
    />
  );
}
