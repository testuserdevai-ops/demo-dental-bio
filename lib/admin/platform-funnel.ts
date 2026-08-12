import { z } from "zod";

export const PLATFORM_FUNNEL_PLANS = ["all", "free", "pro", "premium"] as const;
export type PlatformFunnelPlan = (typeof PLATFORM_FUNNEL_PLANS)[number];

export const PLATFORM_FUNNEL_COHORTS = ["all", "organic", "referred"] as const;
export type PlatformFunnelCohort = (typeof PLATFORM_FUNNEL_COHORTS)[number];

export type PlatformFunnelFilters = {
  startDate: string;
  endDate: string;
  plan: PlatformFunnelPlan;
  domain: string;
  cohort: PlatformFunnelCohort;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function utcDate(value: string | undefined) {
  if (!value || !datePattern.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

function formatUtcDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function parsePlatformFunnelFilters(
  input: {
    start?: string;
    end?: string;
    plan?: string;
    domain?: string;
    cohort?: string;
  },
  now = new Date(),
): PlatformFunnelFilters {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const defaultStart = new Date(today);
  defaultStart.setUTCDate(defaultStart.getUTCDate() - 29);

  const requestedStart = utcDate(input.start);
  const requestedEnd = utcDate(input.end);
  const rangeDays =
    requestedStart && requestedEnd
      ? Math.floor(
          (requestedEnd.getTime() - requestedStart.getTime()) / 86_400_000,
        ) + 1
      : null;
  const validRange =
    requestedStart !== null &&
    requestedEnd !== null &&
    requestedStart <= requestedEnd &&
    requestedEnd <= today &&
    rangeDays !== null &&
    rangeDays <= 731;

  const plan = PLATFORM_FUNNEL_PLANS.includes(input.plan as PlatformFunnelPlan)
    ? (input.plan as PlatformFunnelPlan)
    : "all";
  const cohort = PLATFORM_FUNNEL_COHORTS.includes(
    input.cohort as PlatformFunnelCohort,
  )
    ? (input.cohort as PlatformFunnelCohort)
    : "all";
  const domain =
    typeof input.domain === "string" &&
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?[.])*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
      input.domain.toLowerCase(),
    ) &&
    input.domain.length <= 253
      ? input.domain.toLowerCase()
      : "all";

  return {
    startDate: formatUtcDate(validRange ? requestedStart : defaultStart),
    endDate: formatUtcDate(validRange ? requestedEnd : today),
    plan,
    domain,
    cohort,
  };
}

const stageSchema = z.object({
  id: z.enum([
    "registered",
    "verified",
    "onboarding_completed",
    "profile_published",
    "first_view",
    "first_action",
  ]),
  label: z.string().min(1).max(80),
  count: z.number().int().nonnegative(),
  medianMinutesFromPrevious: z.number().nonnegative().nullable(),
  elapsedDefinition: z.string().max(80).optional(),
});

const countBucketSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(80),
  count: z.number().int().nonnegative(),
});

export const platformFunnelPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  cohortSize: z.number().int().nonnegative(),
  stages: z.array(stageSchema).length(6),
  registrationCoverage: z.object({
    completed: z.number().int().nonnegative(),
    cohort: z.number().int().nonnegative(),
  }),
  onboardingStarted: z.number().int().nonnegative(),
  completionDistribution: z.array(countBucketSchema).length(6),
  trafficGaps: z.object({
    analyticsCoverageStartedAt: z.string().datetime().nullable(),
    zeroTraffic: z.number().int().nonnegative().nullable(),
    zeroTrafficEligible: z.number().int().nonnegative(),
    viewedNoAction: z.number().int().nonnegative(),
  }),
  moduleAdoption: z.array(countBucketSchema),
  unavailable: z.array(
    z.object({
      id: z.string().min(1).max(64),
      reason: z.string().min(1).max(240),
    }),
  ),
});

export type PlatformFunnelPayload = z.infer<typeof platformFunnelPayloadSchema>;

export type PlatformFunnelStage = PlatformFunnelPayload["stages"][number] & {
  cohortRate: number | null;
  previousStageRate: number | null;
};

export type PlatformFunnelModel = Omit<PlatformFunnelPayload, "stages"> & {
  filters: PlatformFunnelFilters;
  stages: PlatformFunnelStage[];
  moduleAdoption: Array<
    PlatformFunnelPayload["moduleAdoption"][number] & { rate: number | null }
  >;
};

export function percentage(numerator: number, denominator: number) {
  return denominator === 0 ? null : (numerator / denominator) * 100;
}

export function toPlatformFunnelModel(
  payload: PlatformFunnelPayload,
  filters: PlatformFunnelFilters,
): PlatformFunnelModel {
  return {
    ...payload,
    filters,
    stages: payload.stages.map((stage, index) => ({
      ...stage,
      cohortRate: percentage(stage.count, payload.cohortSize),
      previousStageRate:
        index === 0
          ? null
          : percentage(stage.count, payload.stages[index - 1]!.count),
    })),
    moduleAdoption: payload.moduleAdoption.map((module) => ({
      ...module,
      rate: percentage(module.count, payload.cohortSize),
    })),
  };
}
