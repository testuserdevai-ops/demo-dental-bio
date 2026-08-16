import Image from "next/image";

import type {
  ProfileTemplateId,
  ProfileThemeId,
} from "@/lib/profile-presentation/catalog";
import type { AppearancePreviewProfile } from "../_lib/profile-preview";
import { PROFILE_TEMPLATE_PREVIEWS } from "../_lib/template-preview-manifest";
import { ProfilePreviewCard } from "./ProfilePreviewCard";

type AppearancePreviewProps = {
  templateId: ProfileTemplateId;
  templateName: string;
  themeId: ProfileThemeId;
  themeName: string;
  profile: AppearancePreviewProfile;
  idSuffix: string;
};

export function AppearancePreview({
  templateId,
  templateName,
  themeId,
  themeName,
  profile,
  idSuffix,
}: AppearancePreviewProps) {
  const preview = PROFILE_TEMPLATE_PREVIEWS[templateId];
  const titleId = `appearance-preview-title-${idSuffix}`;

  return (
    <aside
      className="lg:sticky lg:top-8 lg:self-start"
      aria-labelledby={titleId}
    >
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--elevation-card)]">
        <div className="bg-secondary p-5 text-secondary-foreground">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Selected appearance
          </p>
          <h2
            id={titleId}
            className="mt-1 text-xl font-bold text-card-foreground"
          >
            {themeName} + {templateName}
          </h2>
        </div>
        <div className="space-y-5 p-5" data-template={templateId}>
          <ProfilePreviewCard
            profile={profile}
            themeId={themeId}
            themeName={themeName}
          />
          <section aria-label={`${templateName} layout preview`}>
            <div className="relative mx-auto aspect-[9/16] w-full max-w-72 overflow-hidden rounded-[var(--radius-md)] border border-border bg-muted">
              <Image
                alt={preview.alt}
                className="object-cover object-top"
                fill
                priority={templateId === "basic"}
                sizes="(min-width: 1024px) 288px, (min-width: 640px) 50vw, 90vw"
                src={preview.src}
              />
              {preview.status === "unavailable" ? (
                <div className="absolute inset-x-4 bottom-4 rounded-[var(--radius-md)] bg-card/95 p-3 text-center text-sm font-semibold text-card-foreground shadow">
                  Preview coming soon
                </div>
              ) : null}
            </div>
            {preview.status === "unavailable" ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {preview.reason}
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </aside>
  );
}
