import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  getProfileTheme,
  profileThemeToCSSProperties,
} from "@/lib/profile-presentation/themes";

type ProfileThemeRootProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "style"
> & {
  children: ReactNode;
  themeId: unknown;
};

/** Applies a controlled theme without exposing an arbitrary style boundary. */
export function ProfileThemeRoot({
  children,
  className,
  themeId,
  ...props
}: ProfileThemeRootProps) {
  const theme = getProfileTheme(themeId);

  return (
    <div
      {...props}
      className={cn(
        "bg-background text-foreground [accent-color:var(--profile-selected)]",
        className,
      )}
      data-profile-theme={theme.id}
      style={profileThemeToCSSProperties(theme)}
    >
      {children}
    </div>
  );
}
