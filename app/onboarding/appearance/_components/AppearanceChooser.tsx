"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button, buttonVariants } from "@/app/components/ui/button";
import { ProfileThemeChoice } from "@/app/components/profile-presentation/ProfileThemeChoice";
import { ProfileThemeRoot } from "@/app/components/profile-presentation/ProfileThemeRoot";
import {
  PROFILE_THEME_CATALOG,
  type ProfilePresentationTier,
  type ProfileTemplateId,
  type ProfileThemeId,
} from "@/lib/profile-presentation/catalog";
import type { ProfilePresentationConfiguration } from "@/lib/profile-presentation/contract";
import { PROFILE_THEMES } from "@/lib/profile-presentation/themes";
import { cn } from "@/lib/utils";
import { OnboardingProgress } from "@/app/onboarding/_components/OnboardingProgress";

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
};

export function AppearanceChooser({
  configuration,
  entitlementTier,
  revision,
  step,
  fallbackNotice,
}: AppearanceChooserProps) {
  const router = useRouter();
  const alertRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [themeId, setThemeId] = useState<ProfileThemeId>(configuration.themeId);
  const [templateId, setTemplateId] = useState<ProfileTemplateId>(
    configuration.templateId,
  );
  const [error, setError] = useState<{
    code: string;
    message: string;
  } | null>(null);

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

  const chooseTheme = (nextThemeId: ProfileThemeId) => {
    setThemeId(nextThemeId);
    setError(null);
  };

  const chooseTemplate = (nextTemplateId: ProfileTemplateId) => {
    setTemplateId(nextTemplateId);
    setError(null);
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveAppearanceChoice({
        step,
        expectedRevision: revision,
        themeId,
        templateId,
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
    <ProfileThemeRoot
      className="min-h-screen bg-background text-foreground"
      themeId={themeId}
    >
      <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <OnboardingProgress current={step === "theme" ? 1 : 2} />
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start xl:gap-16">
          <section aria-labelledby="appearance-step-title">
            <header className="max-w-2xl space-y-3">
              <p className="text-sm font-bold text-primary">
                Step {step === "theme" ? "1 of 3" : "2 of 3"}
              </p>
              <h1
                id="appearance-step-title"
                className="text-3xl font-bold tracking-tight sm:text-4xl"
              >
                {step === "theme"
                  ? "Choose your color theme"
                  : "Choose your profile template"}
              </h1>
              <p className="text-base leading-7 text-muted-foreground sm:text-lg">
                {step === "theme"
                  ? "Start with a curated, contrast-tested palette. You can review the combined look before anything is published."
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
              className="mt-8"
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
                        <div className="relative" key={theme.id}>
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
                  <div className="mt-6 lg:hidden">
                    <AppearancePreview
                      idSuffix="mobile-theme"
                      templateId={selectedTemplate.id}
                      templateName={selectedTemplate.name}
                      themeId={themeId}
                      themeName={selectedTheme.displayName}
                      structure={selectedTemplate.structure}
                    />
                  </div>
                </fieldset>
              ) : (
                <fieldset disabled={isPending}>
                  <legend className="sr-only">Profile template</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {PROFILE_TEMPLATE_CHOICES.map((template) => (
                      <div className="min-w-0" key={template.id}>
                        <TemplateChoiceCard
                          {...template}
                          checked={templateId === template.id}
                          entitlementTier={entitlementTier}
                          onChange={chooseTemplate}
                        />
                        {templateId === template.id ? (
                          <div className="mt-4 lg:hidden">
                            <AppearancePreview
                              idSuffix={`mobile-${template.id}`}
                              templateId={template.id}
                              templateName={template.name}
                              themeId={themeId}
                              themeName={selectedTheme.displayName}
                              structure={template.structure}
                            />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </fieldset>
              )}

              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                {step === "template" ? (
                  <Link
                    className={cn(buttonVariants({ variant: "ghost" }))}
                    href="/onboarding/appearance?step=theme"
                  >
                    <ArrowLeftIcon aria-hidden="true" /> Back to colors
                  </Link>
                ) : (
                  <Link
                    className={cn(buttonVariants({ variant: "ghost" }))}
                    href="/dashboard"
                  >
                    Finish later
                  </Link>
                )}
                <Button type="submit" size="lg" isPending={isPending}>
                  {step === "theme"
                    ? "Save color and choose a template"
                    : "Save template and continue to questions"}
                  {!isPending ? <ArrowRightIcon aria-hidden="true" /> : null}
                </Button>
              </div>
              <p className="sr-only" aria-live="polite">
                {isPending ? "Saving your private appearance draft" : ""}
              </p>
            </form>
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
    </ProfileThemeRoot>
  );
}
