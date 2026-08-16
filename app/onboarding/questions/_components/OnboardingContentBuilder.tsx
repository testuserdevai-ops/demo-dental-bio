"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircleIcon } from "@phosphor-icons/react";

import { DashboardQueryProvider } from "@/app/dashboard/_components/DashboardQueryProvider";
import ProfileEditorForm from "@/app/dashboard/_components/ProfileEditorForm";
import SocialLinksEditorForm from "@/app/dashboard/_components/SocialLinksEditorForm";
import {
  saveProfile,
  saveSocialLinks,
} from "@/app/dashboard/_lib/profile/actions";
import { GalleryForm } from "@/app/dashboard/gallery/_components/GalleryForm";
import { useGalleryMutations } from "@/app/dashboard/gallery/_lib/hooks";
import { GroupForm as LinkGroupForm } from "@/app/dashboard/links/components/GroupForm";
import { LinkForm } from "@/app/dashboard/links/components/LinkForm";
import {
  useLinkAggregate,
  useLinkMutations,
} from "@/app/dashboard/links/_lib/hooks";
import { LocationForm } from "@/app/dashboard/location/_components/LocationForm";
import { useLocationMutations } from "@/app/dashboard/location/_lib/hooks";
import { ReviewForm } from "@/app/dashboard/review/_components/ReviewForm";
import { useReviewMutations } from "@/app/dashboard/review/_lib/hooks";
import { ProductForm } from "@/app/dashboard/shop/_components/ProductForm";
import { useProductMutations } from "@/app/dashboard/shop/_lib/hooks";
import AddTreatment from "@/app/dashboard/treatments/AddTreatment";
import { createTreatment } from "@/app/dashboard/treatments/actions";
import { GroupForm as VideoGroupForm } from "@/app/dashboard/video/_components/GroupForm";
import { VideoForm } from "@/app/dashboard/video/_components/VideoForm";
import {
  useVideoAggregate,
  useVideoMutations,
} from "@/app/dashboard/video/_lib/hooks";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button, buttonVariants } from "@/app/components/ui/button";
import type { ProfileQuestion } from "@/lib/profile-presentation/questions/registry";
import { dashboardTargetHref } from "@/lib/dashboard/target";
import { cn } from "@/lib/utils";
import {
  getExistingBuilderItems,
  type ExistingBuilderItem,
  type OnboardingBuilderContext,
  type OnboardingBuilderContextSeed,
} from "./existing-builder-items";
import { loadOnboardingBuilderData } from "../actions";

export type { OnboardingBuilderContextSeed } from "./existing-builder-items";

function ExistingContentList({ items }: { items: ExistingBuilderItem[] }) {
  if (!items.length) return null;
  return (
    <section
      aria-labelledby="onboarding-existing-content-title"
      className="mt-5 rounded-[var(--radius-md)] border border-border bg-muted/40 p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3
          className="text-sm font-bold text-foreground"
          id="onboarding-existing-content-title"
        >
          Already saved
        </h3>
        <span className="text-xs font-semibold text-muted-foreground">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Check your existing content before adding another.
      </p>
      <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
        {items.map((item) => (
          <li
            className="rounded-[var(--radius-sm)] border border-border bg-card px-3 py-2"
            key={`${item.id}-${item.label}`}
          >
            <p className="break-words text-sm font-semibold text-card-foreground">
              {item.label}
            </p>
            {item.description ? (
              <p className="mt-0.5 break-words text-xs text-muted-foreground">
                {item.description}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function BuilderBody({
  context,
  onSaved,
  onStructureSaved,
  question,
}: {
  context: OnboardingBuilderContext;
  onSaved(): void;
  onStructureSaved(): void;
  question: Extract<ProfileQuestion, { kind: "content-builder" }>;
}) {
  const locationMutations = useLocationMutations({
    scopeId: context.scopeId,
    targetHint: context.targetHint,
  });
  const reviewMutations = useReviewMutations({
    scopeId: context.scopeId,
    targetHint: context.targetHint,
  });
  const galleryMutations = useGalleryMutations({
    scopeId: context.scopeId,
    targetHint: context.targetHint,
  });
  const productMutations = useProductMutations({
    scopeId: context.scopeId,
    targetHint: context.targetHint,
  });
  const linkQuery = useLinkAggregate({
    scopeId: context.scopeId,
    targetHint: context.targetHint,
    data: context.links,
    updatedAt: 0,
  });
  const linkMutations = useLinkMutations({
    scopeId: context.scopeId,
    targetHint: context.targetHint,
  });
  const videoQuery = useVideoAggregate({
    scopeId: context.scopeId,
    targetHint: context.targetHint,
    data: context.videos,
    updatedAt: 0,
  });
  const videoMutations = useVideoMutations({
    scopeId: context.scopeId,
    targetHint: context.targetHint,
  });
  const firstLinkGroup = linkQuery.data.groups[0];
  const firstVideoGroup = videoQuery.data.groups[0];

  switch (question.builder) {
    case "profile":
      return (
        <ProfileEditorForm
          afterSuccess={onSaved}
          save={(input) => saveProfile(context.targetHint, input)}
          value={context.profile}
        />
      );
    case "socials":
      return (
        <SocialLinksEditorForm
          afterSuccess={onSaved}
          save={(input) => saveSocialLinks(context.targetHint, input)}
          value={context.profile.socials}
        />
      );
    case "treatment":
      return (
        <AddTreatment
          onCreate={async (input) => {
            const result = await createTreatment(context.targetHint, input);
            if (result.ok) onSaved();
            return result;
          }}
        />
      );
    case "location":
      return <LocationForm mutations={locationMutations} onDone={onSaved} />;
    case "review":
      return (
        <ReviewForm
          mutations={reviewMutations}
          onComplete={onSaved}
          userId={context.userId}
        />
      );
    case "gallery":
      return (
        <GalleryForm
          editor={{ kind: "dental" }}
          mutations={galleryMutations}
          onComplete={onSaved}
          userId={context.userId}
        />
      );
    case "product":
      return (
        <ProductForm
          editor={{}}
          mutations={productMutations}
          onDone={onSaved}
          userId={context.userId}
        />
      );
    case "link":
      return firstLinkGroup ? (
        <LinkForm
          afterSuccess={onSaved}
          groupId={firstLinkGroup.id}
          mutations={linkMutations}
          userId={context.userId}
        />
      ) : (
        <LinkGroupForm
          mutations={linkMutations}
          afterSuccess={onStructureSaved}
        />
      );
    case "video":
      return firstVideoGroup ? (
        <VideoForm
          editor={{ kind: "video", group: firstVideoGroup }}
          mutations={videoMutations}
          onDone={onSaved}
        />
      ) : (
        <VideoGroupForm
          editor={{ kind: "group" }}
          mutations={videoMutations}
          onDone={onStructureSaved}
        />
      );
  }
}

export function OnboardingContentBuilder({
  context,
  onStepCompleted,
  question,
}: {
  context: OnboardingBuilderContextSeed;
  onStepCompleted(): Promise<boolean>;
  question: Extract<ProfileQuestion, { kind: "content-builder" }>;
}) {
  const [formKey, setFormKey] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [builderContext, setBuilderContext] =
    useState<OnboardingBuilderContext | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadBuilder = useCallback(async () => {
    setLoadError(null);
    const result = await loadOnboardingBuilderData({
      builder: question.builder,
      targetUserId: context.targetHint,
    });
    if (!result.ok) {
      setLoadError(
        result.formError ?? "We could not load this setup editor. Try again.",
      );
      setIsLoading(false);
      return;
    }
    setBuilderContext({ ...context, ...result.data });
    setIsLoading(false);
  }, [context, question.builder]);

  useEffect(() => {
    let active = true;
    void loadOnboardingBuilderData({
      builder: question.builder,
      targetUserId: context.targetHint,
    }).then((result) => {
      if (!active) return;
      if (!result.ok) {
        setLoadError(
          result.formError ?? "We could not load this setup editor. Try again.",
        );
        setIsLoading(false);
        return;
      }
      setBuilderContext({ ...context, ...result.data });
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [context, question.builder]);

  const onSaved = () => {
    setSavedCount((count) => count + 1);
    setFormKey((key) => key + 1);
    void loadBuilder();
    void onStepCompleted();
  };
  const onStructureSaved = () => {
    setFormKey((key) => key + 1);
    void loadBuilder();
  };
  const existingItems = builderContext
    ? getExistingBuilderItems({
        builder: question.builder,
        context: builderContext,
      })
    : [];

  return (
    <section aria-labelledby={`${question.id}-title`}>
      <h2 className="text-2xl font-bold" id={`${question.id}-title`}>
        {question.title}
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          Optional
        </span>
      </h2>
      <p className="mt-2 leading-7 text-muted-foreground">
        {question.helpText}
      </p>
      {loadError ? (
        <Alert className="mt-5" role="alert" variant="destructive">
          <AlertTitle>Editor not loaded</AlertTitle>
          <AlertDescription>
            <p>{loadError}</p>
            <Button
              className="mt-3"
              onClick={() => {
                setIsLoading(true);
                void loadBuilder();
              }}
              type="button"
              variant="outline"
            >
              Retry editor
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      <ExistingContentList items={existingItems} />
      {savedCount > 0 ? (
        <p
          className="mt-4 flex items-center gap-2 text-sm font-medium text-primary"
          role="status"
        >
          <CheckCircleIcon aria-hidden="true" className="size-5" />
          Saved.{" "}
          {question.allowMultiple
            ? "You can add another or continue."
            : "You can continue when ready."}
        </p>
      ) : null}
      <div className="mt-6">
        {isLoading ? (
          <div
            aria-busy="true"
            aria-label="Loading setup editor"
            className="h-56 animate-pulse rounded-[var(--radius-md)] bg-muted motion-reduce:animate-none"
          />
        ) : builderContext ? (
          <DashboardQueryProvider>
            <div key={formKey}>
              <BuilderBody
                context={builderContext}
                onSaved={onSaved}
                onStructureSaved={onStructureSaved}
                question={question}
              />
            </div>
          </DashboardQueryProvider>
        ) : null}
      </div>
      <Link
        className={cn(buttonVariants({ variant: "ghost" }), "mt-4")}
        href={dashboardTargetHref(question.builderHref, context.targetHint)}
      >
        Open the full editor
      </Link>
    </section>
  );
}
