import { ProfileThemeRoot } from "@/app/components/profile-presentation/ProfileThemeRoot";
import type { ProfileThemeId } from "@/lib/profile-presentation/catalog";

import type { AppearancePreviewProfile } from "../_lib/profile-preview";

type ProfilePreviewCardProps = {
  profile: AppearancePreviewProfile;
  themeId: ProfileThemeId;
  themeName: string;
};

export function ProfilePreviewCard({
  profile,
  themeId,
  themeName,
}: ProfilePreviewCardProps) {
  return (
    <ProfileThemeRoot
      aria-label={`${themeName} profile preview for ${profile.displayName}, ${profile.specialty}, showing Book appointment and View services`}
      className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background shadow-[var(--elevation-card)]"
      data-preview-theme-scope
      data-testid="semantic-theme-preview"
      role="img"
      themeId={themeId}
    >
      <div aria-hidden="true">
        <div className="flex items-center justify-center gap-4 border-b border-border bg-card px-4 py-3 text-[11px] font-semibold text-muted-foreground sm:text-xs">
          <span>About</span>
          <span>Services</span>
          <span>Contact</span>
        </div>
        <div className="space-y-4 px-5 py-5 text-center sm:px-7 sm:py-7">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-base font-bold text-secondary-foreground sm:size-16 sm:text-lg">
            {profile.initials}
          </div>
          <div>
            <p className="text-lg font-bold text-foreground sm:text-xl">
              {profile.displayName}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.specialty}
            </p>
          </div>
          <div className="grid gap-2.5">
            <span className="rounded-[var(--radius-md)] bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">
              Book appointment
            </span>
            <span className="rounded-[var(--radius-md)] border border-border bg-secondary px-4 py-3 text-sm font-bold text-secondary-foreground">
              View services
            </span>
          </div>
        </div>
      </div>
    </ProfileThemeRoot>
  );
}
