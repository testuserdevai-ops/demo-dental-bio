import { z } from "zod";

const boundedFilter = z.string().trim().max(160);

export const adminUserFilterSchema = z.object({
  email: boundedFilter,
  first_name: boundedFilter,
  middle_name: boundedFilter,
  last_name: boundedFilter,
  username: boundedFilter,
  country: boundedFilter,
  subscription_status: z.enum([
    "all",
    "trialing",
    "FREE",
    "PRO",
    "PREMIUM PRO",
  ]),
  isVerified: z.enum(["all", "true", "false"]),
});

export type AdminUserFilterInput = z.infer<typeof adminUserFilterSchema>;

export const emptyAdminUserFilters: AdminUserFilterInput = {
  email: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  username: "",
  country: "",
  subscription_status: "all",
  isVerified: "all",
};

export function toAdminUserFilterPayload(filters: AdminUserFilterInput) {
  return {
    email: filters.email,
    first_name: filters.first_name,
    middle_name: filters.middle_name,
    last_name: filters.last_name,
    username: filters.username,
    country: filters.country,
    subscription_status:
      filters.subscription_status === "all"
        ? undefined
        : filters.subscription_status,
    isVerified:
      filters.isVerified === "true"
        ? true
        : filters.isVerified === "false"
          ? false
          : undefined,
  };
}

export const announcementSchema = z.object({
  title: z.string().max(160, "Title must be 160 characters or fewer"),
  content: z.string().max(2_000, "Message must be 2,000 characters or fewer"),
});

export type AnnouncementInput = z.infer<typeof announcementSchema>;

function isCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const planChangeSchema = z.object({
  plan: z.enum(["FREE", "PRO", "PREMIUM PRO"]),
  period_end: z
    .string()
    .refine(isCalendarDate, "Enter a valid period end date")
    .or(z.literal("")),
});

export type PlanChangeInput = z.infer<typeof planChangeSchema>;

export function resolvePlanEndDate(values: PlanChangeInput): Date | null {
  if (values.plan === "FREE") return null;
  if (!values.period_end) return new Date("9999-12-31");
  return new Date(`${values.period_end}T00:00:00`);
}

export type AdminPlanUser = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  subscription_status?: string | null;
};
