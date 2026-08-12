"use client";

import {
  createContext,
  useContext,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";
import {
  getProfileTheme,
  profileThemeToCSSProperties,
  type ProfileThemeDefinition,
} from "@/lib/profile-presentation/themes";

const ProfileThemeContext = createContext<ProfileThemeDefinition | null>(null);

/** Makes the controlled profile theme available to React portals. */
export function useProfileTheme(): ProfileThemeDefinition {
  return useContext(ProfileThemeContext) ?? getProfileTheme(null);
}

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
    <ProfileThemeContext.Provider value={theme}>
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
    </ProfileThemeContext.Provider>
  );
}
