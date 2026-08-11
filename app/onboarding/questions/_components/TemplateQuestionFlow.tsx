"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";

import { ProfileThemeRoot } from "@/app/components/profile-presentation/ProfileThemeRoot";
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

import { saveQuestionAnswers } from "../actions";
import { ProfileQuestionField } from "./ProfileQuestionField";
import { QuestionDraftReview } from "./QuestionDraftReview";

type SaveStatus = "saved" | "saving" | "error";

type TemplateQuestionFlowProps = {
  templateId: ProfileTemplateId;
  themeId: ProfileThemeId;
  initialAnswers: Record<string, unknown>;
  initialRevision: number;
  initialStep: string;
  contentOptions: QuestionContentOptions;
  fallbackNotice?: string;
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
}: TemplateQuestionFlowProps) {
  const router = useRouter();
  const questionSet = getProfileQuestionSet(templateId);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const [answers, setAnswers] =
    useState<Record<string, unknown>>(initialAnswers);
  const [baseAnswers, setBaseAnswers] =
    useState<Record<string, unknown>>(initialAnswers);
  const [revision, setRevision] = useState(initialRevision);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [formError, setFormError] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const visibleQuestions = useMemo(
    () => getVisibleProfileQuestions(templateId, answers),
    [answers, templateId],
  );
  const currentQuestion = visibleQuestions.find(({ id }) => id === initialStep);
  const currentIndex = currentQuestion
    ? visibleQuestions.findIndex(({ id }) => id === currentQuestion.id)
    : -1;
  const isReview = initialStep === "review";

  useEffect(() => {
    headingRef.current?.focus();
  }, [initialStep]);

  useEffect(() => {
    if (formError) alertRef.current?.focus();
  }, [formError]);

  async function persist(
    nextAnswers: Record<string, unknown>,
    intent: "autosave" | "complete",
  ) {
    setSaveStatus("saving");
    setFormError(null);
    const result = await saveQuestionAnswers({
      templateId,
      expectedRevision: revision,
      baseAnswers,
      answers: nextAnswers,
      intent,
    });

    if (!result.ok) {
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
      return null;
    }

    setAnswers(result.data.answers);
    setBaseAnswers(result.data.answers);
    setRevision(result.data.revision);
    setFieldErrors({});
    setSaveStatus("saved");
    return result.data;
  }

  async function updateAnswer(field: string, value: unknown) {
    const nextAnswers = { ...answers, [field]: value };
    setAnswers(nextAnswers);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    await persist(nextAnswers, "autosave");
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
        document.getElementById(`${currentQuestion.id}-error`)?.focus();
      });
      return;
    }

    const nextQuestion = visibleQuestions[currentIndex + 1];
    if (nextQuestion) {
      router.push(
        `/onboarding/questions?template=${templateId}&step=${nextQuestion.id}`,
      );
      return;
    }

    const completed = await persist(answers, "complete");
    if (completed) {
      router.push(`/onboarding/questions?template=${templateId}&step=review`);
    }
  }

  const previousQuestion =
    currentIndex > 0 ? visibleQuestions[currentIndex - 1] : null;
  const previousHref = previousQuestion
    ? `/onboarding/questions?template=${templateId}&step=${previousQuestion.id}`
    : "/onboarding/appearance?step=template";
  const editHref = visibleQuestions.length
    ? `/onboarding/questions?template=${templateId}&step=${visibleQuestions.at(-1)?.id}`
    : `/onboarding/questions?template=${templateId}`;
  const summary = summarizeProfileQuestionAnswers({
    templateId,
    answers,
    contentOptions,
  });

  return (
    <ProfileThemeRoot
      className="min-h-screen bg-background text-foreground"
      themeId={themeId}
    >
      <main className="mx-auto w-full max-w-5xl px-5 pt-8 pb-32 sm:px-8 sm:pt-12 md:pb-12">
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
                {formError.code === "CONFLICT" ||
                formError.code === "TEMPLATE_CHANGED" ? (
                  <Button
                    className="mt-3"
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
              moduleOrder={questionSet.outputModuleOrder}
              summary={summary}
              templateId={templateId}
              themeId={themeId}
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
                  This private draft reuses your existing builder content.
                  Switching templates never deletes those treatments, links,
                  images, reviews, products, or locations.
                </p>
              </header>

              <div className="mt-8 rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-sm sm:p-8">
                <ProfileQuestionField
                  contentOptions={contentOptions}
                  disabled={saveStatus === "saving"}
                  error={
                    "field" in currentQuestion
                      ? fieldErrors[currentQuestion.field]
                      : undefined
                  }
                  onChange={updateAnswer}
                  question={currentQuestion}
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
                {saveStatus === "saving" ? "Saving private draft…" : null}
                {saveStatus === "saved" ? (
                  <>
                    <CheckCircleIcon
                      aria-hidden="true"
                      className="size-4 text-primary"
                    />
                    Private draft saved
                  </>
                ) : null}
                {saveStatus === "error" ? "Draft not saved" : null}
              </div>

              <OnboardingActionBar>
                <Link
                  className={cn(buttonVariants({ variant: "ghost" }))}
                  href={previousHref}
                >
                  <ArrowLeftIcon aria-hidden="true" /> Back
                </Link>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    className={cn(buttonVariants({ variant: "ghost" }))}
                    href="/dashboard"
                  >
                    Finish later
                  </Link>
                  <Button
                    disabled={saveStatus === "saving"}
                    isPending={saveStatus === "saving"}
                    onClick={continueFromQuestion}
                    size="lg"
                    type="button"
                  >
                    {currentIndex === visibleQuestions.length - 1
                      ? "Review private draft"
                      : "Continue"}
                    {saveStatus !== "saving" ? (
                      <ArrowRightIcon aria-hidden="true" />
                    ) : null}
                  </Button>
                </div>
              </OnboardingActionBar>
            </section>
          ) : null}
        </div>
      </main>
    </ProfileThemeRoot>
  );
}
