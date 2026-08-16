import { Card, CardContent, CardHeader } from "@/app/components/ui/card";
import type { ProfileThemeId } from "@/lib/profile-presentation/catalog";
import { cn } from "@/lib/utils";

import type { AppearancePreviewProfile } from "../_lib/profile-preview";
import { ProfilePreviewCard } from "./ProfilePreviewCard";

type ThemeProfilePreviewProps = {
  className?: string;
  profile: AppearancePreviewProfile;
  themeId: ProfileThemeId;
  themeName: string;
};

export function ThemeProfilePreview({
  className,
  profile,
  themeId,
  themeName,
}: ThemeProfilePreviewProps) {
  return (
    <aside
      aria-label="Live profile preview"
      className={cn("lg:sticky lg:top-8 lg:self-start", className)}
    >
      <Card className="overflow-hidden shadow-[var(--elevation-card)]">
        <CardHeader className="border-b border-border px-4 py-3 sm:px-5">
          <p className="text-sm font-bold text-card-foreground">Preview</p>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <ProfilePreviewCard
            profile={profile}
            themeId={themeId}
            themeName={themeName}
          />
        </CardContent>
      </Card>
    </aside>
  );
}
