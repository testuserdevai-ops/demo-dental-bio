import type { PublicProfileViewModel } from "../_lib/public-profile";
import { selectAvailablePublicTemplate } from "../_lib/public-template-selector";
import BasicProfileTemplate from "./BasicProfileTemplate";

type PublicProfileTemplateProps = {
  username: string;
  profile: PublicProfileViewModel;
};

export default function PublicProfileTemplate(
  props: PublicProfileTemplateProps,
) {
  const templateId = selectAvailablePublicTemplate(
    props.profile.presentation.configuration.templateId,
  );

  switch (templateId) {
    case "basic":
      return <BasicProfileTemplate {...props} />;
  }
}
