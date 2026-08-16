"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button, buttonVariants } from "@/app/components/ui/button";
import { OnboardingProgress } from "@/app/onboarding/_components/OnboardingProgress";
import { OnboardingActionBar } from "@/app/onboarding/_components/OnboardingActionBar";
import {
  PROFILE_TEMPLATE_CATALOG,
  type ProfileTemplateId,
  type ProfileThemeId,
} from "@/lib/profile-presentation/catalog";
import {
  getProfileQuestionSet,
  getVisibleProfileQuestions,
  summarizeProfileQuestionAnswers,
  type QuestionContentOptions,
} from "@/lib/profile-presentation/questions/registry";
import { cn } from "@/lib/utils";
import { dashboardTargetHref } from "@/lib/dashboard/target";

import { completeQuestionStep, saveQuestionAnswers } from "../actions";
import { ProfileQuestionField } from "./ProfileQuestionField";
import { QuestionDraftReview } from "./QuestionDraftReview";
import type { OnboardingBuilderContextSeed } from "./OnboardingContentBuilder";

type SaveStatus = "saved" | "saving" | "error";
type FormError = { code: string; message: string };

type TemplateQuestionFlowProps = {
  templateId: ProfileTemplateId;
  themeId: ProfileThemeId;
  initialAnswers: Record<string, unknown>;
  initialRevision: number;
  initialStep: string;
  contentOptions: QuestionContentOptions;
  fallbackNotice?: string;
  builderContext: OnboardingBuilderContextSeed;
  initialCompletedStepIds: string[];
  targetUserId?: string;
};

function valueMissing(value: unknown) {
  return (
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && !value.length)
  );
}

export function TemplateQuestionFlow({
  templateId,
  themeId,
  initialAnswers,
  initialRevision,
  initialStep,
  contentOptions,
  fallbackNotice,
  builderContext,
  initialCompletedStepIds,
  targetUserId,
}: TemplateQuestionFlowProps) {
  const router = useRouter();
  const questionSet = getProfileQuestionSet(templateId);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const answersRef = useRef<Record<string, unknown>>(initialAnswers);
  const baseAnswersRef = useRef<Record<string, unknown>>(initialAnswers);
  const revisionRef = useRef(initialRevision);
  const queuedAnswersRef = useRef<Record<string, unknown> | null>(null);
  const answerSaveLoopRef = useRef<Promise<boolean> | null>(null);
  const answerSaveFailedRef = useRef(false);
  const queuedStepIdsRef = useRef<string[]>([]);
  const failedStepIdsRef = useRef<string[]>([]);
  const stepSaveLoopRef = useRef<Promise<boolean> | null>(null);
  const [answers, setAnswers] =
    useState<Record<string, unknown>>(initialAnswers);
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [formError, setFormError] = useState<FormError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [completedStepIds, setCompletedStepIds] = useState(
    () => new Set(initialCompletedStepIds),
  );
  const [stepSaving, setStepSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const visibleQuestions = useMemo(
    () => getVisibleProfileQuestions(templateId, answers),
    [answers, templateId],
  );
  const currentQuestion = visibleQuestions.find(({ id }) => id === currentStep);
  const currentIndex = currentQuestion
    ? visibleQuestions.findIndex(({ id }) => id === currentQuestion.id)
    : -1;
  const isReview = currentStep === "review";

  useEffect(() => {
    headingRef.current?.focus();
  }, [currentStep]);

  useEffect(() => {
    const handlePopState = () => {
      const step = new URL(window.location.href).searchParams.get("step");
      if (
        step === "review" ||
        (step && visibleQuestions.some(({ id }) => id === step))
      ) {
        setCurrentStep(step);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [visibleQuestions]);

  useEffect(() => {
    if (formError) alertRef.current?.focus();
  }, [formError]);

  function setSaveFailure(
    result: Extract<
      Awaited<ReturnType<typeof saveQuestionAnswers>>,
      { ok: false }
    >,
  ) {
    answerSaveFailedRef.current = true;
    setSaveStatus("error");
    setFieldErrors(
      Object.fromEntries(
        Object.entries(result.fieldErrors ?? {}).map(([field, messages]) => [
          field,
          messages[0] ?? "Review this answer.",
        ]),
      ),
    );
    setFormError({
      code: result.code,
      message:
        result.formError ??
        "Some answers need attention before this draft can be saved.",
    });
  }

  async function persistAnswers(
    nextAnswers: Record<string, unknown>,
    intent: "autosave" | "complete",
  ) {
    setSaveStatus("saving");
    setFormError(null);
    const result = await saveQuestionAnswers({
      templateId,
      expectedRevision: revisionRef.current,
      baseAnswers: baseAnswersRef.current,
      answers: nextAnswers,
      intent,
      targetUserId,
    });

    if (!result.ok) {
      setSaveFailure(result);
      return null;
    }

    answerSaveFailedRef.current = false;
    baseAnswersRef.current = result.data.answers;
    revisionRef.current = result.data.revision;
    if (JSON.stringify(answersRef.current) === JSON.stringify(nextAnswers)) {
      answersRef.current = result.data.answers;
      setAnswers(result.data.answers);
    }
    setFieldErrors({});
    setSaveStatus("saved");
    return result.data;
  }

  function startAnswerSaveLoop(): Promise<boolean> {
    if (answerSaveLoopRef.current) return answerSaveLoopRef.current;
    const loop = (async () => {
      while (queuedAnswersRef.current) {
        const nextAnswers = queuedAnswersRef.current;
        queuedAnswersRef.current = null;
        if (!(await persistAnswers(nextAnswers, "autosave"))) return false;
      }
      return true;
    })();
    answerSaveLoopRef.current = loop;
    void loop.finally(() => {
      if (answerSaveLoopRef.current === loop) {
        answerSaveLoopRef.current = null;
      }
      if (queuedAnswersRef.current && !answerSaveFailedRef.current) {
        startAnswerSaveLoop();
      }
    });
    return loop;
  }

  function queueAnswerSave(nextAnswers: Record<string, unknown>) {
    queuedAnswersRef.current = nextAnswers;
    answerSaveFailedRef.current = false;
    setSaveStatus("saving");
    setFormError(null);
    void startAnswerSaveLoop();
  }

  function updateAnswer(field: string, value: unknown) {
    const nextAnswers = { ...answersRef.current, [field]: value };
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    queueAnswerSave(nextAnswers);
  }

  function questionHref(step: string) {
    return dashboardTargetHref(
      `/onboarding/questions?template=${templateId}&step=${step}`,
      targetUserId,
    );
  }

  function navigateToStep(step: string, mode: "push" | "replace" = "push") {
    setCurrentStep(step);
    const method = mode === "push" ? "pushState" : "replaceState";
    window.history[method](null, "", questionHref(step));
  }

  function startStepSaveLoop(): Promise<boolean> {
    if (stepSaveLoopRef.current) return stepSaveLoopRef.current;
    const loop = (async () => {
      while (queuedStepIdsRef.current.length) {
        const stepId = queuedStepIdsRef.current.shift()!;
        const result = await completeQuestionStep({
          templateId,
          stepId,
          targetUserId,
        });
        if (!result.ok) {
          failedStepIdsRef.current.push(stepId);
          setFormError({
            code: result.code,
            message:
              result.formError ??
              "We could not save this setup progress. Try again.",
          });
          return false;
        }
        setCompletedStepIds(
          (current) => new Set([...result.data.completedStepIds, ...current]),
        );
      }
      return true;
    })();
    stepSaveLoopRef.current = loop;
    setStepSaving(true);
    void loop.finally(() => {
      if (stepSaveLoopRef.current === loop) stepSaveLoopRef.current = null;
      setStepSaving(false);
      if (queuedStepIdsRef.current.length && !failedStepIdsRef.current.length) {
        startStepSaveLoop();
      }
    });
    return loop;
  }

  function queueCurrentStepCompletion() {
    if (!currentQuestion || currentQuestion.kind !== "content-builder") return;
    if (completedStepIds.has(currentQuestion.id)) return;
    setCompletedStepIds((current) => new Set(current).add(currentQuestion.id));
    if (!queuedStepIdsRef.current.includes(currentQuestion.id)) {
      queuedStepIdsRef.current.push(currentQuestion.id);
    }
    setFormError(null);
    void startStepSaveLoop();
  }

  async function flushBackgroundSaves() {
    if (answerSaveFailedRef.current) queueAnswerSave(answersRef.current);
    if (failedStepIdsRef.current.length) {
      queuedStepIdsRef.current.unshift(...failedStepIdsRef.current.splice(0));
      void startStepSaveLoop();
    }

    while (answerSaveLoopRef.current || queuedAnswersRef.current) {
      const loop = answerSaveLoopRef.current ?? startAnswerSaveLoop();
      if (!(await loop)) return false;
    }
    while (stepSaveLoopRef.current || queuedStepIdsRef.current.length) {
      const loop = stepSaveLoopRef.current ?? startStepSaveLoop();
      if (!(await loop)) return false;
    }
    return !answerSaveFailedRef.current && !failedStepIdsRef.current.length;
  }

  async function retryFailedSaves() {
    setFormError(null);
    await flushBackgroundSaves();
  }

  async function continueFromQuestion() {
    if (!currentQuestion) return;
    if (
      "field" in currentQuestion &&
      currentQuestion.required &&
      valueMissing(answers[currentQuestion.field])
    ) {
      setFieldErrors((current) => ({
        ...current,
        [currentQuestion.field]: "Choose an answer before continuing.",
      }));
      requestAnimationFrame(() => {
        const error = document.getElementById(`${currentQuestion.id}-error`);
        error?.focus({ preventScroll: true });
        if (typeof error?.scrollIntoView === "function") {
          error.scrollIntoView({ block: "center" });
        }
        const actionBar = document.querySelector<HTMLElement>(
          "[data-onboarding-action-bar]",
        );
        if (error && actionBar && typeof window.scrollBy === "function") {
          const overlap =
            error.getBoundingClientRect().bottom -
            actionBar.getBoundingClientRect().top +
            16;
          if (overlap > 0) window.scrollBy({ top: overlap, behavior: "auto" });
        }
      });
      return;
    }

    queueCurrentStepCompletion();

    const nextQuestion = visibleQuestions[currentIndex + 1];
    if (nextQuestion) {
      navigateToStep(nextQuestion.id);
      return;
    }

    setIsFinalizing(true);
    const flushed = await flushBackgroundSaves();
    const completed = flushed
      ? await persistAnswers(answersRef.current, "complete")
      : null;
    setIsFinalizing(false);
    if (completed) {
      navigateToStep("review");
    }
  }

  async function markCurrentStepCompleted() {
    queueCurrentStepCompletion();
    return true;
  }

  async function skipCurrentQuestion() {
    if (!currentQuestion) return;
    queueCurrentStepCompletion();
    const nextQuestion = visibleQuestions[currentIndex + 1];
    if (nextQuestion) {
      navigateToStep(nextQuestion.id);
      return;
    }

    setIsFinalizing(true);
    const flushed = await flushBackgroundSaves();
    const completed = flushed
      ? await persistAnswers(answersRef.current, "complete")
      : null;
    setIsFinalizing(false);
    if (completed) {
      navigateToStep("review");
    }
  }

  async function finishLater() {
    setIsLeaving(true);
    if (await flushBackgroundSaves()) {
      router.push(dashboardTargetHref("/dashboard", targetUserId));
      return;
    }
    setIsLeaving(false);
  }

  const previousQuestion =
    currentIndex > 0 ? visibleQuestions[currentIndex - 1] : null;
  const previousHref = dashboardTargetHref(
    previousQuestion
      ? `/onboarding/questions?template=${templateId}&step=${previousQuestion.id}`
      : "/onboarding/appearance?step=template",
    targetUserId,
  );
  const editHref = dashboardTargetHref(
    visibleQuestions.length
      ? `/onboarding/questions?template=${templateId}&step=${visibleQuestions.at(-1)?.id}`
      : `/onboarding/questions?template=${templateId}`,
    targetUserId,
  );
  const summary = summarizeProfileQuestionAnswers({
    templateId,
    answers,
    contentOptions,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-5xl px-5 pt-8 pb-56 sm:px-8 sm:pt-12 md:pb-12">
        <div className="mx-auto max-w-3xl">
          <OnboardingProgress current={3} />
        </div>

        <div className="mx-auto mt-10 max-w-3xl">
          {fallbackNotice ? (
            <Alert className="mb-6" role="status">
              <AlertTitle>We used your available appearance</AlertTitle>
              <AlertDescription>{fallbackNotice}</AlertDescription>
            </Alert>
          ) : null}

          {formError ? (
            <Alert
              className="mb-6"
              ref={alertRef}
              role="alert"
              tabIndex={-1}
              variant="destructive"
            >
              <AlertTitle>Your draft was not saved</AlertTitle>
              <AlertDescription>
                <p>{formError.message}</p>
                <Button
                  className="mt-3"
                  onClick={retryFailedSaves}
                  type="button"
                  variant="outline"
                >
                  Retry save
                </Button>
                {formError.code === "CONFLICT" ||
                formError.code === "TEMPLATE_CHANGED" ? (
                  <Button
                    className="mt-3 ml-3"
                    onClick={() => router.refresh()}
                    type="button"
                    variant="outline"
                  >
                    Reload saved draft
                  </Button>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {isReview ? (
            <QuestionDraftReview
              editHref={editHref}
              dashboardHref={dashboardTargetHref("/dashboard", targetUserId)}
              moduleOrder={questionSet.outputModuleOrder}
              summary={summary}
              templateId={templateId}
              themeId={themeId}
              onEdit={() =>
                navigateToStep(visibleQuestions.at(-1)?.id ?? "review")
              }
            />
          ) : currentQuestion ? (
            <section aria-labelledby="question-flow-title">
              <header>
                <p className="text-sm font-bold text-primary">
                  Question {currentIndex + 1} of {visibleQuestions.length}
                </p>
                <h1
                  className="mt-2 text-3xl font-bold tracking-tight outline-none sm:text-4xl"
                  id="question-flow-title"
                  ref={headingRef}
                  tabIndex={-1}
                >
                  {questionSet.title}
                </h1>
                <p className="mt-3 text-base leading-7 text-muted-foreground sm:text-lg">
                  {questionSet.introduction}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Your public bio uses the content you save here or in the full
                  editor. Switching templates never deletes those treatments,
                  links, images, reviews, products, or locations.
                </p>
              </header>

              <div className="mt-8 rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-sm sm:p-8">
                <ProfileQuestionField
                  builderContext={builderContext}
                  contentOptions={contentOptions}
                  disabled={isFinalizing || isLeaving}
                  error={
                    "field" in currentQuestion
                      ? fieldErrors[currentQuestion.field]
                      : undefined
                  }
                  onChange={updateAnswer}
                  onStepCompleted={markCurrentStepCompleted}
                  question={currentQuestion}
                  key={currentQuestion.id}
                  value={
                    "field" in currentQuestion
                      ? answers[currentQuestion.field]
                      : undefined
                  }
                />
              </div>

              <div
                className="mt-4 flex min-h-6 items-center gap-2 text-sm text-muted-foreground"
                aria-live="polite"
              >
                {saveStatus === "saving" || stepSaving ? "Saving setup…" : null}
                {saveStatus === "saved" && !stepSaving ? (
                  <>
                    <CheckCircleIcon
                      aria-hidden="true"
                      className="size-4 text-primary"
                    />
                    Setup saved
                  </>
                ) : null}
                {saveStatus === "error" || failedStepIdsRef.current.length
                  ? "Draft not saved"
                  : null}
              </div>

              <OnboardingActionBar>
                {previousQuestion ? (
                  <Button
                    className="min-h-11"
                    onClick={() => navigateToStep(previousQuestion.id)}
                    type="button"
                    variant="ghost"
                  >
                    <ArrowLeftIcon aria-hidden="true" /> Back
                  </Button>
                ) : (
                  <Link
                    className={cn(
                      buttonVariants({ variant: "ghost" }),
                      "min-h-11",
                    )}
                    href={previousHref}
                  >
                    <ArrowLeftIcon aria-hidden="true" /> Back
                  </Link>
                )}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    className="min-h-11"
                    disabled={isLeaving || isFinalizing}
                    isPending={isLeaving}
                    onClick={finishLater}
                    type="button"
                    variant="ghost"
                  >
                    Finish later
                  </Button>
                  <Button
                    className="min-h-11"
                    disabled={isLeaving || isFinalizing}
                    onClick={skipCurrentQuestion}
                    type="button"
                    variant="outline"
                  >
                    Skip
                  </Button>
                  <Button
                    disabled={isLeaving || isFinalizing}
                    isPending={isFinalizing}
                    onClick={continueFromQuestion}
                    size="lg"
                    type="button"
                  >
                    {currentIndex === visibleQuestions.length - 1
                      ? "Review setup"
                      : "Continue"}
                    {!isFinalizing ? (
                      <ArrowRightIcon aria-hidden="true" />
                    ) : null}
                  </Button>
                </div>
              </OnboardingActionBar>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
