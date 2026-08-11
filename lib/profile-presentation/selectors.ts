import {
  PROFILE_LAYOUT_CATALOG,
  PROFILE_TEMPLATE_CATALOG,
  PROFILE_THEME_CATALOG,
  type ProfileModuleId,
} from "./catalog";
import type { ProfilePresentationConfiguration } from "./contract";

export type ProfilePresentationSettings = {
  template: (typeof PROFILE_TEMPLATE_CATALOG)[ProfilePresentationConfiguration["templateId"]];
  theme: (typeof PROFILE_THEME_CATALOG)[ProfilePresentationConfiguration["themeId"]];
  layout: (typeof PROFILE_LAYOUT_CATALOG)[ProfilePresentationConfiguration["layoutVariant"]];
  moduleOrder: readonly ProfileModuleId[];
};

export function selectProfilePresentationSettings(
  configuration: ProfilePresentationConfiguration,
): ProfilePresentationSettings {
  const template = PROFILE_TEMPLATE_CATALOG[configuration.templateId];

  return {
    template,
    theme: PROFILE_THEME_CATALOG[configuration.themeId],
    layout: PROFILE_LAYOUT_CATALOG[configuration.layoutVariant],
    moduleOrder: template.moduleOrder,
  };
}

export function selectVisibleProfileModules(
  configuration: ProfilePresentationConfiguration,
  populatedModules: ReadonlySet<ProfileModuleId>,
): readonly ProfileModuleId[] {
  return PROFILE_TEMPLATE_CATALOG[configuration.templateId].moduleOrder.filter(
    (moduleId) => populatedModules.has(moduleId),
  );
}
