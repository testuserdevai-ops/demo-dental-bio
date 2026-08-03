"use client";

import React, { useActionState, useMemo, useState } from "react";
import {
  FacebookLogoIcon,
  InstagramLogoIcon,
  TiktokLogoIcon,
  XLogoIcon,
} from "@phosphor-icons/react";
import LabeledInput from "./LabeledInput";
import SaveButton from "./SaveButton";
import SocialProfileVisitButton from "./SocialProfileVisitButton";
import {
  parseSocialMediaProfile,
  socialPlatforms,
  socialProfileConfigs,
  type SocialPlatform,
} from "@/utils/functions/socialMediaProfiles";

export type SocialLinksValues = Record<SocialPlatform, string>;

export type SocialLinksFormState = {
  errors: Partial<Record<SocialPlatform, string>>;
  message?: string;
  success?: boolean;
};

type Props = {
  userId: string;
  initialValues: SocialLinksValues;
  action: (
    state: SocialLinksFormState,
    formData: FormData,
  ) => Promise<SocialLinksFormState>;
};

const icons = {
  twitter: XLogoIcon,
  instagram: InstagramLogoIcon,
  facebook: FacebookLogoIcon,
  tiktok: TiktokLogoIcon,
};

const initialFormState: SocialLinksFormState = { errors: {} };

export default function SocialLinksEditor({
  userId,
  initialValues,
  action,
}: Props) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [values, setValues] = useState(initialValues);
  const [clientErrors, setClientErrors] = useState<
    Partial<Record<SocialPlatform, string>>
  >(() => {
    const errors: Partial<Record<SocialPlatform, string>> = {};
    for (const platform of socialPlatforms) {
      const result = parseSocialMediaProfile(initialValues[platform], platform);
      if (!result.valid)
        errors[platform] =
          `${result.message} Please correct this stored value before saving.`;
    }
    return errors;
  });

  const errors = useMemo(
    () => ({ ...state.errors, ...clientErrors }),
    [state.errors, clientErrors],
  );

  function validate(platform: SocialPlatform, value: string) {
    const result = parseSocialMediaProfile(value, platform);
    setClientErrors((current) => ({
      ...current,
      [platform]: result.valid ? undefined : result.message,
    }));
    return result.valid;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const nextErrors: Partial<Record<SocialPlatform, string>> = {};
    for (const platform of socialPlatforms) {
      const result = parseSocialMediaProfile(values[platform], platform);
      if (!result.valid) nextErrors[platform] = result.message;
    }
    if (Object.keys(nextErrors).length) {
      event.preventDefault();
      setClientErrors(nextErrors);
    }
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      className="flex-col-gap mb-6 mt-6"
      noValidate
    >
      <input type="hidden" name="userId" value={userId} />
      <h2 className="text-lg font-semibold">Social Links</h2>
      <p className="text-sm text-neutral-600">
        Enter an @username or a complete profile URL. All fields are optional.
      </p>

      {socialPlatforms.map((platform) => {
        const config = socialProfileConfigs[platform];
        const Icon = icons[platform];
        const name = `${platform}_link`;
        return (
          <LabeledInput
            key={platform}
            label={config.label}
            className="w-full text-base pl-7"
            name={name}
            value={values[platform]}
            placeholder={config.placeholder}
            helperText={config.helperText}
            error={errors[platform]}
            endAdornment={
              <SocialProfileVisitButton
                platform={platform}
                value={values[platform]}
              />
            }
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="url"
            onBlur={(event) => validate(platform, event.target.value)}
            onChange={(event) => {
              setValues((current) => ({
                ...current,
                [platform]: event.target.value,
              }));
              if (errors[platform]) validate(platform, event.target.value);
            }}
          >
            <Icon
              size={24}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
            />
          </LabeledInput>
        );
      })}

      {state.message && (
        <p
          role={state.success ? "status" : "alert"}
          className={
            state.success ? "text-green-700 text-sm" : "text-red-500 text-sm"
          }
        >
          {state.message}
        </p>
      )}
      <div className="w-full flex items-end justify-end">
        <SaveButton />
      </div>
    </form>
  );
}
