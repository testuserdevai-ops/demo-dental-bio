import "server-only";

import type { Json } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

import {
  deriveProfilePresentationEntitlement,
  parseProfilePresentationConfiguration,
  resolveProfilePresentationConfiguration,
  type ProfilePresentationConfiguration,
  type ProfilePresentationEntitlement,
} from "./contract";

export type ProfilePresentationState = {
  entitlement: ProfilePresentationEntitlement;
  published: {
    saved: ProfilePresentationConfiguration;
    effective: ProfilePresentationConfiguration;
    revision: number;
    publishedAt: string | null;
  };
  draft: {
    configuration: ProfilePresentationConfiguration;
    revision: number;
    updatedAt: string | null;
  } | null;
};

export type ProfilePresentationPersistenceErrorCode =
  | "NOT_FOUND"
  | "CONFLICT"
  | "FORBIDDEN"
  | "INVALID_CONFIGURATION"
  | "PERSISTENCE_FAILED";

export class ProfilePresentationPersistenceError extends Error {
  constructor(
    public readonly code: ProfilePresentationPersistenceErrorCode,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = "ProfilePresentationPersistenceError";
  }
}

type SupabaseError = { code?: string; message: string };

function persistenceError(error: SupabaseError) {
  const code: ProfilePresentationPersistenceErrorCode =
    error.code === "40001"
      ? "CONFLICT"
      : error.code === "42501"
        ? "FORBIDDEN"
        : error.code === "22023"
          ? "INVALID_CONFIGURATION"
          : error.code === "P0002"
            ? "NOT_FOUND"
            : "PERSISTENCE_FAILED";
  return new ProfilePresentationPersistenceError(code, { cause: error });
}

const persistedConfigurationSchema = z
  .object({
    configuration: z.unknown(),
    revision: z.number().int().nonnegative(),
    updated_at: z.string().nullable(),
  })
  .strict();

const publishedConfigurationSchema = z
  .object({
    configuration: z.unknown(),
    revision: z.number().int().nonnegative(),
    published_at: z.string().nullable(),
  })
  .strict();

async function readPresentationOwner(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select(
      "subscription_status, trial_end, profile_presentation_published, profile_presentation_published_revision, profile_presentation_published_at, profile_presentation_draft, profile_presentation_draft_revision, profile_presentation_draft_updated_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) throw persistenceError(error);
  if (!data) throw new ProfilePresentationPersistenceError("NOT_FOUND");
  return data;
}

export async function getProfilePresentationState(
  userId: string,
  now = new Date(),
): Promise<ProfilePresentationState> {
  const row = await readPresentationOwner(userId);
  const entitlement = deriveProfilePresentationEntitlement(row, now);
  const savedPublished = resolveProfilePresentationConfiguration(
    row.profile_presentation_published,
    { tier: "pro" },
  ).configuration;
  const effectivePublished = resolveProfilePresentationConfiguration(
    row.profile_presentation_published,
    entitlement,
  ).configuration;
  const draft = row.profile_presentation_draft
    ? {
        configuration: resolveProfilePresentationConfiguration(
          row.profile_presentation_draft,
          { tier: "pro" },
        ).configuration,
        revision: row.profile_presentation_draft_revision,
        updatedAt: row.profile_presentation_draft_updated_at,
      }
    : null;

  return {
    entitlement,
    published: {
      saved: savedPublished,
      effective: effectivePublished,
      revision: row.profile_presentation_published_revision,
      publishedAt: row.profile_presentation_published_at,
    },
    draft,
  };
}

export async function saveProfilePresentationDraft(input: {
  userId: string;
  expectedRevision: number;
  configuration: unknown;
}): Promise<ProfilePresentationState["draft"]> {
  const owner = await readPresentationOwner(input.userId);
  const entitlement = deriveProfilePresentationEntitlement(owner);
  const configuration = parseProfilePresentationConfiguration(
    input.configuration,
    entitlement,
  );
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .rpc("save_profile_presentation_draft", {
      p_target_user_id: input.userId,
      p_expected_revision: input.expectedRevision,
      p_configuration: configuration as unknown as Json,
    })
    .single();

  if (error) throw persistenceError(error);
  const saved = persistedConfigurationSchema.parse(data);
  return {
    configuration: parseProfilePresentationConfiguration(
      saved.configuration,
      entitlement,
    ),
    revision: saved.revision,
    updatedAt: saved.updated_at,
  };
}

export async function publishProfilePresentation(input: {
  userId: string;
  expectedDraftRevision: number;
  expectedPublishedRevision: number;
}) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .rpc("publish_profile_presentation", {
      p_target_user_id: input.userId,
      p_expected_draft_revision: input.expectedDraftRevision,
      p_expected_published_revision: input.expectedPublishedRevision,
    })
    .single();

  if (error) throw persistenceError(error);
  const published = publishedConfigurationSchema.parse(data);
  return {
    configuration: parseProfilePresentationConfiguration(
      published.configuration,
      { tier: "pro" },
    ),
    revision: published.revision,
    publishedAt: published.published_at,
  };
}
