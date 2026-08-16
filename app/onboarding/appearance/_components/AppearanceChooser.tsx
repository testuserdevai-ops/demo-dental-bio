"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  FALLBACK_APPEARANCE_PREVIEW_PROFILE,
  type AppearancePreviewProfile,
} from "../_lib/profile-preview";
import { AppearancePreview } from "./AppearancePreview";
import { TemplateChoiceCard } from "./TemplateChoiceCard";
import { ThemeProfilePreview } from "./ThemeProfilePreview";

type AppearanceChooserProps = {
  configuration: ProfilePresentationConfiguration;
  entitlementTier: ProfilePresentationTier;
  revision: number;
  step: "theme" | "template";
  fallbackNotice?: string;
  profile?: AppearancePreviewProfile;
  targetUserId?: string;
};

export function AppearanceChooser({
  configuration,
  entitlementTier,
  revision,
  step,
  fallbackNotice,
  profile = FALLBACK_APPEARANCE_PREVIEW_PROFILE,
  targetUserId,
}: AppearanceChooserProps) {
  const router = useRouter();
  const alertRef = useRef<HTMLDivElement>(null);
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);
  const revisionRef = useRef(revision);
  const themeNeedsSaveRef = useRef(false);
  const themeVersionRef = useRef(0);
  const themeSavePromiseRef = useRef<Promise<boolean> | null>(null);
  const [activeStep, setActiveStep] = useState(step);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
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
  const [previewTemplateId, setPreviewTemplateId] =
    useState<ProfileTemplateId | null>(null);

  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);

  useEffect(() => {
    const handlePopState = () => {
      const nextStep = new URL(window.location.href).searchParams.get("step");
      if (nextStep === "theme" || nextStep === "template") {
        setActiveStep(nextStep);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const selectedTemplate = useMemo(
    () =>
      PROFILE_TEMPLATE_CHOICES.find((option) => option.id === templateId) ??
      PROFILE_TEMPLATE_CHOICES[0],
    [templateId],
  );
  const selectedTheme = PROFILE_THEMES[themeId];
  const previewTemplate =
    PROFILE_TEMPLATE_CHOICES.find(
      (option) => option.id === previewTemplateId,
    ) ?? selectedTemplate;
  const previewMinimumTier = previewTemplateId
    ? previewTemplate.minimumTier
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
    activeStep === "template" &&
    templateId !== configuration.templateId &&
    Object.keys(configuration.answers).length > 0;

  const chooseTheme = (nextThemeId: ProfileThemeId) => {
    setThemeId(nextThemeId);
    themeVersionRef.current += 1;
    themeNeedsSaveRef.current = true;
    setError(null);
  };

  const chooseTemplate = (nextTemplateId: ProfileTemplateId) => {
    setTemplateId(nextTemplateId);
    setConfirmTemplateAnswerReset(false);
    setError(null);
  };

  const openTemplatePreview = (
    nextTemplateId: ProfileTemplateId,
    trigger: HTMLButtonElement,
  ) => {
    previewTriggerRef.current = trigger;
    setPreviewTemplateId(nextTemplateId);
  };

  const usePreviewedChoice = () => {
    if (!previewTemplateId || previewAvailability.locked) return;
    chooseTemplate(previewTemplateId);
    setPreviewTemplateId(null);
  };

  const appearanceHref = (nextStep: "theme" | "template") =>
    dashboardTargetHref(
      `/onboarding/appearance?step=${nextStep}`,
      targetUserId,
    );

  const navigateToAppearanceStep = (nextStep: "theme" | "template") => {
    setActiveStep(nextStep);
    window.history.pushState(null, "", appearanceHref(nextStep));
  };

  const ensureThemeSaved = () => {
    if (themeSavePromiseRef.current) return themeSavePromiseRef.current;
    if (!themeNeedsSaveRef.current) return Promise.resolve(true);

    const savingVersion = themeVersionRef.current;
    setIsSavingTheme(true);
    const promise = saveAppearanceChoice({
      step: "theme",
      expectedRevision: revisionRef.current,
      themeId,
      templateId,
      confirmTemplateAnswerReset: false,
      targetUserId,
    })
      .then((result) => {
        if (!result.ok) {
          setError({
            code: result.code,
            message: result.formError ?? "Review your choices and try again.",
          });
          return false;
        }
        revisionRef.current = result.data.revision;
        if (themeVersionRef.current === savingVersion) {
          themeNeedsSaveRef.current = false;
        }
        return true;
      })
      .finally(() => {
        themeSavePromiseRef.current = null;
        setIsSavingTheme(false);
      });
    themeSavePromiseRef.current = promise;
    return promise;
  };

  const submit = async () => {
    setError(null);
    if (activeStep === "theme") {
      themeNeedsSaveRef.current = true;
      navigateToAppearanceStep("template");
      void ensureThemeSaved();
      return;
    }

    setIsSavingTemplate(true);
    while (themeNeedsSaveRef.current) {
      if (!(await ensureThemeSaved())) {
        setIsSavingTemplate(false);
        return;
      }
    }
    const result = await saveAppearanceChoice({
      step: "template",
      expectedRevision: revisionRef.current,
      themeId,
      templateId,
      confirmTemplateAnswerReset,
      targetUserId,
    });
    setIsSavingTemplate(false);
    if (!result.ok) {
      setError({
        code: result.code,
        message: result.formError ?? "Review your choices and try again.",
      });
      return;
    }
    revisionRef.current = result.data.revision;
    router.push(result.data.nextHref);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-7xl px-4 pt-4 pb-24 sm:px-8 sm:pt-12 md:pb-12 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <OnboardingProgress current={activeStep === "theme" ? 1 : 2} />
        </div>

        <section
          aria-labelledby="appearance-step-title"
          className="mt-6 grid gap-5 sm:mt-10 lg:grid-cols-[minmax(0,28rem)_minmax(22rem,1fr)] lg:items-start lg:gap-x-10 lg:gap-y-8 xl:gap-x-14"
        >
          <div>
            <header className="max-w-2xl space-y-2 sm:space-y-3">
              <h1
                id="appearance-step-title"
                className="text-2xl font-bold tracking-tight sm:text-4xl"
              >
                {activeStep === "theme"
                  ? "Choose your colors"
                  : "Choose your profile template"}
              </h1>
              {activeStep === "template" ? (
                <p className="text-sm leading-6 text-muted-foreground sm:text-lg sm:leading-7">
                  Choose how patients should move through your profile.
                </p>
              ) : null}
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
          </div>

          {activeStep === "theme" ? (
            <ThemeProfilePreview
              className="lg:col-start-2 lg:row-span-2 lg:row-start-1"
              profile={profile}
              themeId={themeId}
              themeName={selectedTheme.displayName}
            />
          ) : (
            <div className="hidden lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block">
              <AppearancePreview
                idSuffix="desktop"
                profile={profile}
                templateId={selectedTemplate.id}
                templateName={selectedTemplate.name}
                themeId={themeId}
                themeName={selectedTheme.displayName}
              />
            </div>
          )}

          <form
            className="lg:col-start-1 lg:row-start-2"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            {activeStep === "theme" ? (
              <div className="space-y-5">
                <fieldset disabled={false}>
                  <legend className="sr-only">Colors</legend>
                  <div className="grid gap-3">
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
                        <div data-theme-choice-card key={theme.id}>
                          <ProfileThemeChoice
                            availabilityDescriptionId={
                              locked ? availabilityId : undefined
                            }
                            checked={themeId === theme.id}
                            disabled={locked}
                            name="profile-theme"
                            onChange={() => chooseTheme(theme.id)}
                            statusLabel={
                              required === "free"
                                ? undefined
                                : availability.label
                            }
                            themeId={theme.id}
                          />
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
                <p
                  aria-live="polite"
                  className="min-h-[4.5rem] text-sm leading-6 text-muted-foreground"
                  data-selected-theme-description
                >
                  {selectedTheme.description}
                </p>
              </div>
            ) : (
              <>
                <fieldset disabled={isSavingTemplate}>
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
                            openTemplatePreview(id, trigger)
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
                      including links, videos, treatments, locations, and stable
                      item IDs, will stay unchanged.
                    </p>
                    <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm font-bold text-card-foreground">
                      <input
                        aria-describedby="template-switch-confirmation-help"
                        checked={confirmTemplateAnswerReset}
                        className="mt-0.5 size-5 shrink-0 accent-primary"
                        disabled={isSavingTemplate}
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
              {activeStep === "template" ? (
                <Button
                  aria-label="Back to colors"
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "min-h-11 shrink-0 px-3 sm:px-4",
                  )}
                  onClick={() => navigateToAppearanceStep("theme")}
                  type="button"
                  variant="ghost"
                >
                  <ArrowLeftIcon aria-hidden="true" />
                  <span className="sm:hidden">Back</span>
                  <span className="hidden sm:inline">Back to colors</span>
                </Button>
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
                isPending={isSavingTemplate}
                className="min-h-11 min-w-0 flex-1 px-3 sm:flex-none sm:px-6"
                aria-label={
                  activeStep === "theme"
                    ? `Continue with ${selectedTheme.displayName}`
                    : "Save template and continue to questions"
                }
              >
                {activeStep === "theme"
                  ? `Continue with ${selectedTheme.displayName}`
                  : "Save template and continue to questions"}
                {!isSavingTemplate ? (
                  <ArrowRightIcon aria-hidden="true" />
                ) : null}
              </Button>
            </OnboardingActionBar>
            <p className="sr-only" aria-live="polite">
              {isSavingTheme || isSavingTemplate
                ? isSavingTheme
                  ? "Saving your color choice"
                  : "Applying your template to your public bio"
                : ""}
            </p>
          </form>

          <Dialog
            open={previewTemplateId !== null}
            onOpenChange={(open) => {
              if (!open) setPreviewTemplateId(null);
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
                  Preview template: {previewTemplate.name}
                </DialogTitle>
                <DialogDescription>
                  Previewing does not change your current choice.
                </DialogDescription>
              </DialogHeader>
              <AppearancePreview
                idSuffix={`dialog-template-${previewTemplateId ?? "closed"}`}
                profile={profile}
                templateId={previewTemplate.id}
                templateName={previewTemplate.name}
                themeId={selectedTheme.id}
                themeName={selectedTheme.displayName}
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
                    : "Use this template"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>
      </main>
    </div>
  );
}
