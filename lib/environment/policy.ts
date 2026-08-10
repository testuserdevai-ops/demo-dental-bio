export const STAGING_ENVIRONMENT = "staging";
export const PRODUCTION_SUPABASE_PROJECT_REF = "cxqkuqtwrtgvoorxidvn";
export const STAGING_VERCEL_PROJECT_ID = "prj_E2DKilXYKsR9PKgPtzB86m3y6DDI";
export const STAGING_VERCEL_TEAM_ID = "team_2pUlvY4ZCmwpa9RsBX9pTNZY";

export type EnvironmentVariables = Readonly<Record<string, string | undefined>>;

function hasValue(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function projectRefFromUrl(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const hostname = new URL(value).hostname;
    const match = /^([a-z0-9]{20})\.supabase\.co$/i.exec(hostname);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function isStagingEnvironment(
  environment: EnvironmentVariables = process.env,
): boolean {
  return environment.APP_ENV === STAGING_ENVIRONMENT;
}

export function getStagingEnvironmentErrors(
  environment: EnvironmentVariables = process.env,
): string[] {
  if (!isStagingEnvironment(environment)) return [];

  const errors: string[] = [];
  const baseUrl = environment.NEXT_PUBLIC_BASE_URL;
  const appUrl = environment.APP_URL;
  const stagingProjectRef = environment.STAGING_SUPABASE_PROJECT_REF?.trim();
  const configuredProjectRef = projectRefFromUrl(
    environment.NEXT_PUBLIC_SUPABASE_URL,
  );

  if (baseUrl !== "https://staging.dental.bio") {
    errors.push(
      "NEXT_PUBLIC_BASE_URL must be https://staging.dental.bio in staging.",
    );
  }
  if (appUrl !== "https://staging.dental.bio") {
    errors.push("APP_URL must be https://staging.dental.bio in staging.");
  }
  if (!stagingProjectRef) {
    errors.push("STAGING_SUPABASE_PROJECT_REF is required in staging.");
  }
  if (!configuredProjectRef) {
    errors.push(
      "NEXT_PUBLIC_SUPABASE_URL must be a hosted Supabase project URL in staging.",
    );
  }
  if (configuredProjectRef === PRODUCTION_SUPABASE_PROJECT_REF) {
    errors.push("The production Supabase project is forbidden in staging.");
  }
  if (
    stagingProjectRef &&
    configuredProjectRef &&
    stagingProjectRef !== configuredProjectRef
  ) {
    errors.push(
      "NEXT_PUBLIC_SUPABASE_URL does not match STAGING_SUPABASE_PROJECT_REF.",
    );
  }
  if (!hasValue(environment.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is required in staging.");
  }
  if (!hasValue(environment.SUPABASE_SERVICE_ROLE_KEY)) {
    errors.push("SUPABASE_SERVICE_ROLE_KEY is required in staging.");
  }

  const stripeSecret = environment.STRIPE_SECRET_KEY?.trim();
  if (
    stripeSecret &&
    !stripeSecret.startsWith("sk_test_") &&
    !stripeSecret.startsWith("rk_test_")
  ) {
    errors.push("STRIPE_SECRET_KEY must be a Stripe test-mode key in staging.");
  }
  const stripePublishable =
    environment.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  if (stripePublishable && !stripePublishable.startsWith("pk_test_")) {
    errors.push(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be a Stripe test-mode key in staging.",
    );
  }

  if (
    hasValue(environment.VERCEL_API_KEY) &&
    environment.VERCEL_PROJECT_ID !== STAGING_VERCEL_PROJECT_ID
  ) {
    errors.push(
      "VERCEL_PROJECT_ID must identify the isolated staging project when VERCEL_API_KEY is configured.",
    );
  }
  if (
    hasValue(environment.VERCEL_API_KEY) &&
    environment.VERCEL_TEAM_ID !== STAGING_VERCEL_TEAM_ID
  ) {
    errors.push(
      "VERCEL_TEAM_ID must identify the staging project team when VERCEL_API_KEY is configured.",
    );
  }

  if (environment.EMAIL_DELIVERY_MODE !== "redirect") {
    errors.push('EMAIL_DELIVERY_MODE must be "redirect" in staging.');
  }
  if (environment.EMAIL_REDIRECT_TO !== "rameznoshy@gmail.com") {
    errors.push("EMAIL_REDIRECT_TO must be rameznoshy@gmail.com in staging.");
  }
  if (environment.EMAIL_SUBJECT_PREFIX !== "[STAGING]") {
    errors.push('EMAIL_SUBJECT_PREFIX must be "[STAGING]" in staging.');
  }
  if (!hasValue(environment.RESEND_API_KEY)) {
    errors.push("A dedicated staging RESEND_API_KEY is required in staging.");
  }

  return errors;
}

export function assertStagingEnvironmentSafety(
  environment: EnvironmentVariables = process.env,
): void {
  const errors = getStagingEnvironmentErrors(environment);
  if (errors.length) {
    throw new Error(`Unsafe staging configuration:\n- ${errors.join("\n- ")}`);
  }
}
