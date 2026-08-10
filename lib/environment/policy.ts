export const STAGING_ENVIRONMENT = "staging";
export const PRODUCTION_SUPABASE_PROJECT_REF = "cxqkuqtwrtgvoorxidvn";

export type EnvironmentVariables = Readonly<Record<string, string | undefined>>;

export type ExternalMutationProvider =
  "cron" | "stripe" | "stripe_webhook" | "vercel" | "veriff";

export class StagingExternalMutationError extends Error {
  readonly code = "STAGING_EXTERNAL_MUTATION_BLOCKED";

  constructor(readonly provider: ExternalMutationProvider) {
    super(`${provider} mutations are disabled in staging.`);
    this.name = "StagingExternalMutationError";
  }
}

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

export function assertExternalMutationAllowed(
  provider: ExternalMutationProvider,
  environment: EnvironmentVariables = process.env,
): void {
  if (isStagingEnvironment(environment)) {
    throw new StagingExternalMutationError(provider);
  }
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
  if (stripeSecret && !stripeSecret.startsWith("rk_")) {
    errors.push("STRIPE_SECRET_KEY must be a restricted rk_ key in staging.");
  }
  if (environment.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_live_")) {
    errors.push("A live Stripe publishable key is forbidden in staging.");
  }

  const forbiddenSecrets = [
    "CRON_SECRET_KEY",
    "NEXT_PUBLIC_ENTRI_API_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "VERCEL_API_KEY",
    "VERIFF_API_KEY",
    "VERIFF_HMAC_SIGNATURE",
    "VERIFF_SHARED_SECRET",
    "WEBHOOK_SECRET",
  ] as const;

  for (const name of forbiddenSecrets) {
    if (hasValue(environment[name])) {
      errors.push(`${name} must not be configured in staging.`);
    }
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
