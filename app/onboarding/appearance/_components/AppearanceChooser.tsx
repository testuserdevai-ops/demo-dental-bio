"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button, buttonVariants } from "@/app/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { ProfileThemeChoice } from "@/app/components/profile-presentation/ProfileThemeChoice";
import { OnboardingActionBar } from "@/app/onboarding/_components/OnboardingActionBar";
import { OnboardingProgress } from "@/app/onboarding/_components/OnboardingProgress";
import {
  PROFILE_THEME_CATALOG,
  type ProfilePresentationTier,
  type ProfileTemplateId,
  type ProfileThemeId,
} from "@/lib/profile-presentation/catalog";
import type { ProfilePresentationConfiguration } from "@/lib/profile-presentation/contract";
import { dashboardTargetHref } from "@/lib/dashboard/target";
import { PROFILE_THEMES } from "@/lib/profile-presentation/themes";
import { cn } from "@/lib/utils";

import { saveAppearanceChoice } from "../actions";
import { resolveAppearanceChoiceAvailability } from "../_lib/choice-availability";
import { PROFILE_TEMPLATE_CHOICES } from "../_lib/chooser-options";
import { AppearancePreview } from "./AppearancePreview";
import { TemplateChoiceCard } from "./TemplateChoiceCard";

type AppearanceChooserProps = {
  configuration: ProfilePresentationConfiguration;
  entitlementTier: ProfilePresentationTier;
  revision: number;
  step: "theme" | "template";
  fallbackNotice?: string;
  targetUserId?: string;
};

type PreviewChoice =
  | { kind: "theme"; id: ProfileThemeId }
  | { kind: "template"; id: ProfileTemplateId };

export function AppearanceChooser({
  configuration,
  entitlementTier,
  revision,
  step,
  fallbackNotice,
  targetUserId,
}: AppearanceChooserProps) {
  const router = useRouter();
  const alertRef = useRef<HTMLDivElement>(null);
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [themeId, setThemeId] = useState<ProfileThemeId>(configuration.themeId);
  const [templateId, setTemplateId] = useState<ProfileTemplateId>(
    configuration.templateId,
  );
  const [confirmTemplateAnswerReset, setConfirmTemplateAnswerReset] =
    useState(false);
  const [error, setError] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [previewChoice, setPreviewChoice] = useState<PreviewChoice | null>(
    null,
  );

  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);

  const selectedTemplate = useMemo(
    () =>
      PROFILE_TEMPLATE_CHOICES.find((option) => option.id === templateId) ??
      PROFILE_TEMPLATE_CHOICES[0],
    [templateId],
  );
  const selectedTheme = PROFILE_THEMES[themeId];
  const previewTemplate =
    previewChoice?.kind === "template"
      ? (PROFILE_TEMPLATE_CHOICES.find(
          (option) => option.id === previewChoice.id,
        ) ?? selectedTemplate)
      : selectedTemplate;
  const previewTheme =
    previewChoice?.kind === "theme"
      ? PROFILE_THEMES[previewChoice.id]
      : selectedTheme;
  const previewMinimumTier = previewChoice
    ? previewChoice.kind === "theme"
      ? PROFILE_THEME_CATALOG[previewChoice.id].minimumTier
      : previewTemplate.minimumTier
    : "free";
  const previewAvailability = resolveAppearanceChoiceAvailability(
    previewMinimumTier,
    entitlementTier,
  );
  const currentTemplate =
    PROFILE_TEMPLATE_CHOICES.find(
      (option) => option.id === configuration.templateId,
    ) ?? PROFILE_TEMPLATE_CHOICES[0];
  const requiresTemplateAnswerResetConfirmation =
    step === "template" &&
    templateId !== configuration.templateId &&
    Object.keys(configuration.answers).length > 0;

  const chooseTheme = (nextThemeId: ProfileThemeId) => {
    setThemeId(nextThemeId);
    setError(null);
  };

  const chooseTemplate = (nextTemplateId: ProfileTemplateId) => {
    setTemplateId(nextTemplateId);
    setConfirmTemplateAnswerReset(false);
    setError(null);
  };

  const openPreview = (choice: PreviewChoice, trigger: HTMLButtonElement) => {
    previewTriggerRef.current = trigger;
    setPreviewChoice(choice);
  };

  const usePreviewedChoice = () => {
    if (!previewChoice || previewAvailability.locked) return;
    if (previewChoice.kind === "theme") chooseTheme(previewChoice.id);
    else chooseTemplate(previewChoice.id);
    setPreviewChoice(null);
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveAppearanceChoice({
        step,
        expectedRevision: revision,
        themeId,
        templateId,
        confirmTemplateAnswerReset,
        targetUserId,
      });
      if (!result.ok) {
        setError({
          code: result.code,
          message: result.formError ?? "Review your choices and try again.",
        });
        return;
      }

      router.push(result.data.nextHref);
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-7xl px-4 pt-4 pb-24 sm:px-8 sm:pt-12 md:pb-12 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <OnboardingProgress current={step === "theme" ? 1 : 2} />
        </div>

        <div className="mt-6 grid gap-8 sm:mt-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-10 xl:gap-16">
          <section aria-labelledby="appearance-step-title">
            <header className="max-w-2xl space-y-2 sm:space-y-3">
              <p className="text-sm font-bold text-primary">
                Step {step === "theme" ? "1 of 3" : "2 of 3"}
              </p>
              <h1
                id="appearance-step-title"
                className="text-2xl font-bold tracking-tight sm:text-4xl"
              >
                {step === "theme"
                  ? "Choose your color theme"
                  : "Choose your profile template"}
              </h1>
              <p className="text-sm leading-6 text-muted-foreground sm:text-lg sm:leading-7">
                {step === "theme"
                  ? "Start with a curated palette. Preview it here before applying it to your public bio. Onboarding and dashboard colors stay unchanged."
                  : "Choose the structure that best matches how patients should move through your profile. Your existing content stays intact."}
              </p>
            </header>

            {fallbackNotice ? (
              <Alert className="mt-6" role="status">
                <AlertTitle>We used a safe available choice</AlertTitle>
                <AlertDescription>{fallbackNotice}</AlertDescription>
              </Alert>
            ) : null}

            {error ? (
              <Alert
                className="mt-6"
                ref={alertRef}
                role="alert"
                tabIndex={-1}
                variant="destructive"
              >
                <AlertTitle>Your choice was not saved</AlertTitle>
                <AlertDescription>
                  <span>{error.message}</span>
                  {error.code === "CONFLICT" ? (
                    <Button
                      className="mt-3"
                      type="button"
                      variant="outline"
                      onClick={() => router.refresh()}
                    >
                      Reload saved choices
                    </Button>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}

            <form
              className="mt-5 sm:mt-8"
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              {step === "theme" ? (
                <fieldset disabled={isPending}>
                  <legend className="sr-only">Color theme</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {Object.values(PROFILE_THEMES).map((theme) => {
                      const required =
                        PROFILE_THEME_CATALOG[theme.id].minimumTier;
                      const availability = resolveAppearanceChoiceAvailability(
                        required,
                        entitlementTier,
                      );
                      const locked = availability.locked;
                      const availabilityId = `theme-${theme.id}-availability`;
                      return (
                        <div
                          className="relative"
                          data-theme-choice-card
                          key={theme.id}
                        >
                          <ProfileThemeChoice
                            availabilityDescriptionId={
                              locked ? availabilityId : undefined
                            }
                            checked={themeId === theme.id}
                            disabled={locked}
                            name="profile-theme"
                            onChange={() => chooseTheme(theme.id)}
                            themeId={theme.id}
                          />
                          <Button
                            aria-label={`Preview ${theme.displayName}`}
                            className="mt-2 min-h-11 w-full lg:hidden"
                            onClick={(event) =>
                              openPreview(
                                { kind: "theme", id: theme.id },
                                event.currentTarget,
                              )
                            }
                            type="button"
                            variant="outline"
                          >
                            Preview
                          </Button>
                          <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-card px-2 py-1 text-xs font-bold text-card-foreground shadow-sm">
                            {availability.label}
                          </span>
                          {locked ? (
                            <p
                              className="mt-2 px-1 text-xs text-muted-foreground"
                              id={availabilityId}
                            >
                              Upgrade to Pro to select {theme.displayName}.
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </fieldset>
              ) : (
                <>
                  <fieldset disabled={isPending}>
                    <legend className="sr-only">Profile template</legend>
                    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                      {PROFILE_TEMPLATE_CHOICES.map((template) => (
                        <div className="min-w-0" key={template.id}>
                          <TemplateChoiceCard
                            {...template}
                            checked={templateId === template.id}
                            entitlementTier={entitlementTier}
                            onChange={chooseTemplate}
                            onPreview={(id, trigger) =>
                              openPreview({ kind: "template", id }, trigger)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </fieldset>
                  {requiresTemplateAnswerResetConfirmation ? (
                    <section
                      aria-labelledby="template-switch-impact-title"
                      aria-live="polite"
                      className="mt-6 rounded-[var(--radius-md)] border border-warning bg-card p-5"
                    >
                      <h2
                        className="text-lg font-bold text-card-foreground"
                        id="template-switch-impact-title"
                      >
                        Confirm this template change
                      </h2>
                      <p
                        className="mt-2 text-sm leading-6 text-muted-foreground"
                        id="template-switch-confirmation-help"
                      >
                        Your saved setup answers for {currentTemplate.name} are
                        specific to that template and will be cleared when you
                        switch to {selectedTemplate.name}. Your profile content,
                        including links, videos, treatments, locations, and
                        stable item IDs, will stay unchanged.
                      </p>
                      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm font-bold text-card-foreground">
                        <input
                          aria-describedby="template-switch-confirmation-help"
                          checked={confirmTemplateAnswerReset}
                          className="mt-0.5 size-5 shrink-0 accent-primary"
                          disabled={isPending}
                          onChange={(event) =>
                            setConfirmTemplateAnswerReset(event.target.checked)
                          }
                          type="checkbox"
                        />
                        <span>
                          I understand and want to clear the previous template
                          setup answers.
                        </span>
                      </label>
                    </section>
                  ) : null}
                </>
              )}

              <OnboardingActionBar className="mt-8" mobileLayout="inline">
                {step === "template" ? (
                  <Link
                    aria-label="Back to colors"
                    className={cn(
                      buttonVariants({ variant: "ghost" }),
                      "min-h-11 shrink-0 px-3 sm:px-4",
                    )}
                    href={dashboardTargetHref(
                      "/onboarding/appearance?step=theme",
                      targetUserId,
                    )}
                  >
                    <ArrowLeftIcon aria-hidden="true" />
                    <span className="sm:hidden">Back</span>
                    <span className="hidden sm:inline">Back to colors</span>
                  </Link>
                ) : (
                  <Link
                    className={cn(
                      buttonVariants({ variant: "ghost" }),
                      "min-h-11 shrink-0 px-3 sm:px-4",
                    )}
                    href={dashboardTargetHref("/dashboard", targetUserId)}
                  >
                    Finish later
                  </Link>
                )}
                <Button
                  aria-describedby={
                    requiresTemplateAnswerResetConfirmation
                      ? "template-switch-confirmation-help"
                      : undefined
                  }
                  disabled={
                    requiresTemplateAnswerResetConfirmation &&
                    !confirmTemplateAnswerReset
                  }
                  type="submit"
                  size="lg"
                  isPending={isPending}
                  className="min-h-11 min-w-0 flex-1 px-3 sm:flex-none sm:px-6"
                  aria-label={
                    step === "theme"
                      ? "Save color and choose a template"
                      : "Save template and continue to questions"
                  }
                >
                  <span className="sm:hidden">Continue</span>
                  <span className="hidden sm:inline">
                    {step === "theme"
                      ? "Save color and choose a template"
                      : "Save template and continue to questions"}
                  </span>
                  {!isPending ? <ArrowRightIcon aria-hidden="true" /> : null}
                </Button>
              </OnboardingActionBar>
              <p className="sr-only" aria-live="polite">
                {isPending
                  ? step === "theme"
                    ? "Saving your color choice"
                    : "Applying your template to your public bio"
                  : ""}
              </p>
            </form>

            <Dialog
              open={previewChoice !== null}
              onOpenChange={(open) => {
                if (!open) setPreviewChoice(null);
              }}
            >
              <DialogContent
                className="bottom-0 left-0 top-auto max-h-[calc(100dvh-0.5rem)] w-full max-w-none translate-x-0 translate-y-0 gap-3 overflow-y-auto rounded-b-none p-4 [&>button]:size-11"
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  previewTriggerRef.current?.focus({ preventScroll: true });
                }}
              >
                <DialogHeader className="pr-12 text-left">
                  <DialogTitle>
                    Preview{" "}
                    {previewChoice?.kind === "theme" ? "color" : "template"}:{" "}
                    {previewChoice?.kind === "theme"
                      ? previewTheme.displayName
                      : previewTemplate.name}
                  </DialogTitle>
                  <DialogDescription>
                    Previewing does not change your current choice.
                  </DialogDescription>
                </DialogHeader>
                <AppearancePreview
                  idSuffix={`dialog-${previewChoice?.kind ?? "choice"}-${previewChoice?.id ?? "closed"}`}
                  templateId={previewTemplate.id}
                  templateName={previewTemplate.name}
                  themeId={previewTheme.id}
                  themeName={previewTheme.displayName}
                  structure={previewTemplate.structure}
                />
                <DialogFooter className="sticky -bottom-4 -mx-4 -mb-4 border-t border-border bg-popover p-4 lg:static lg:m-0 lg:border-0 lg:bg-transparent lg:p-0">
                  <DialogClose asChild>
                    <Button className="min-h-11" type="button" variant="ghost">
                      Done
                    </Button>
                  </DialogClose>
                  <Button
                    className="min-h-11"
                    disabled={previewAvailability.locked}
                    onClick={usePreviewedChoice}
                    type="button"
                  >
                    {previewAvailability.locked
                      ? previewAvailability.label
                      : previewChoice?.kind === "theme"
                        ? "Use this color"
                        : "Use this template"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </section>

          <div className="hidden lg:block">
            <AppearancePreview
              idSuffix="desktop"
              templateId={selectedTemplate.id}
              templateName={selectedTemplate.name}
              themeId={themeId}
              themeName={selectedTheme.displayName}
              structure={selectedTemplate.structure}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
