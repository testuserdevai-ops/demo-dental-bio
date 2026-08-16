import Image from "next/image";

import { ProfileThemeRoot } from "@/app/components/profile-presentation/ProfileThemeRoot";
import type {
  ProfileTemplateId,
  ProfileThemeId,
} from "@/lib/profile-presentation/catalog";
import { PROFILE_TEMPLATE_PREVIEWS } from "../_lib/template-preview-manifest";

type AppearancePreviewProps = {
  templateId: ProfileTemplateId;
  templateName: string;
  themeId: ProfileThemeId;
  themeName: string;
  structure: readonly string[];
  idSuffix: string;
};

export function AppearancePreview({
  templateId,
  templateName,
  themeId,
  themeName,
  structure,
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
        <div
          className="space-y-5 p-5"
          data-template={templateId}
          data-theme={themeId}
        >
          <section aria-label={`${themeName} semantic theme sample`}>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Theme response
            </p>
            <ProfileThemeRoot
              className="mt-2 space-y-3 rounded-[var(--radius-md)] border border-border bg-background p-4"
              data-preview-theme-scope
              data-testid="semantic-theme-preview"
              themeId={themeId}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-11 place-items-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
                >
                  DB
                </span>
                <span>
                  <span className="block text-sm font-bold text-foreground">
                    Dr Alex Morgan
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    General and cosmetic dentist
                  </span>
                </span>
              </div>
              <div className="rounded-[var(--radius-md)] bg-primary px-4 py-3 text-center text-sm font-bold text-primary-foreground">
                Book an appointment
              </div>
              <div className="flex flex-wrap gap-2">
                {structure.map((item) => (
                  <span
                    className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold text-card-foreground"
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </ProfileThemeRoot>
          </section>
          <section aria-label={`${templateName} template reference`}>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Template reference
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {preview.status === "available"
                ? "Seeded showcase capture. Theme colors are demonstrated separately above."
                : "A seeded showcase capture has not landed for this renderer yet."}
            </p>
            <div className="relative mx-auto mt-3 aspect-[9/16] w-full max-w-72 overflow-hidden rounded-[var(--radius-md)] border border-border bg-muted">
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
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Representative content only. Saving a template applies this appearance
        to your public bio, not to onboarding or the dashboard.
      </p>
    </aside>
  );
}
