"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircleIcon } from "@phosphor-icons/react";

import { DashboardQueryProvider } from "@/app/dashboard/_components/DashboardQueryProvider";
import ProfileEditorForm from "@/app/dashboard/_components/ProfileEditorForm";
import SocialLinksEditorForm from "@/app/dashboard/_components/SocialLinksEditorForm";
import {
  saveProfile,
  saveSocialLinks,
} from "@/app/dashboard/_lib/profile/actions";
import type { ProfileViewModel } from "@/app/dashboard/_lib/profile/queries";
import { GalleryForm } from "@/app/dashboard/gallery/_components/GalleryForm";
import { useGalleryMutations } from "@/app/dashboard/gallery/_lib/hooks";
import { GroupForm as LinkGroupForm } from "@/app/dashboard/links/components/GroupForm";
import { LinkForm } from "@/app/dashboard/links/components/LinkForm";
import {
  useLinkAggregate,
  useLinkMutations,
} from "@/app/dashboard/links/_lib/hooks";
import type { LinkAggregate } from "@/app/dashboard/links/_lib/queries";
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
import type { VideoAggregate } from "@/app/dashboard/video/_lib/queries";
import { buttonVariants } from "@/app/components/ui/button";
import type { ProfileQuestion } from "@/lib/profile-presentation/questions/registry";
import { cn } from "@/lib/utils";

export type OnboardingBuilderContext = {
  scopeId: string;
  userId: string;
  profile: ProfileViewModel;
  links: LinkAggregate;
  videos: VideoAggregate;
};

function BuilderBody({
  context,
  onSaved,
  question,
}: {
  context: OnboardingBuilderContext;
  onSaved(): void;
  question: Extract<ProfileQuestion, { kind: "content-builder" }>;
}) {
  const locationMutations = useLocationMutations({ scopeId: context.scopeId });
  const reviewMutations = useReviewMutations({
    scopeId: context.scopeId,
    targetHint: undefined,
  });
  const galleryMutations = useGalleryMutations({
    scopeId: context.scopeId,
    targetHint: undefined,
  });
  const productMutations = useProductMutations({ scopeId: context.scopeId });
  const linkQuery = useLinkAggregate({
    scopeId: context.scopeId,
    targetHint: undefined,
    data: context.links,
    updatedAt: 0,
  });
  const linkMutations = useLinkMutations({
    scopeId: context.scopeId,
    targetHint: undefined,
  });
  const videoQuery = useVideoAggregate({
    scopeId: context.scopeId,
    data: context.videos,
    updatedAt: 0,
  });
  const videoMutations = useVideoMutations({ scopeId: context.scopeId });
  const firstLinkGroup = linkQuery.data.groups[0];
  const firstVideoGroup = videoQuery.data.groups[0];

  switch (question.builder) {
    case "profile":
      return (
        <ProfileEditorForm
          afterSuccess={onSaved}
          save={(input) => saveProfile(undefined, input)}
          value={context.profile}
        />
      );
    case "socials":
      return (
        <SocialLinksEditorForm
          afterSuccess={onSaved}
          save={(input) => saveSocialLinks(undefined, input)}
          value={context.profile.socials}
        />
      );
    case "treatment":
      return (
        <AddTreatment
          onCreate={async (input) => {
            const result = await createTreatment(undefined, input);
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
        <LinkGroupForm mutations={linkMutations} afterSuccess={onSaved} />
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
          onDone={onSaved}
        />
      );
  }
}

export function OnboardingContentBuilder({
  context,
  question,
}: {
  context: OnboardingBuilderContext;
  question: Extract<ProfileQuestion, { kind: "content-builder" }>;
}) {
  const [formKey, setFormKey] = useState(0);
  const [savedCount, setSavedCount] = useState(0);

  const onSaved = () => {
    setSavedCount((count) => count + 1);
    setFormKey((key) => key + 1);
  };

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
      <div className="mt-6" key={formKey}>
        <DashboardQueryProvider>
          <BuilderBody
            context={context}
            onSaved={onSaved}
            question={question}
          />
        </DashboardQueryProvider>
      </div>
      <Link
        className={cn(buttonVariants({ variant: "ghost" }), "mt-4")}
        href={question.builderHref}
      >
        Open the full editor
      </Link>
    </section>
  );
}
