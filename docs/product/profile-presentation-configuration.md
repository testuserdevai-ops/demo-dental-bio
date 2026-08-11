# Profile presentation configuration

This document defines the versioned persistence contract shared by profile
templates, themes, layouts, onboarding, preview, and public rendering.

## Version 1 envelope

```json
{
  "schemaVersion": 1,
  "templateId": "basic",
  "themeId": "clinical-light",
  "layoutVariant": "classic-stack",
  "answers": {}
}
```

The default is always Basic + Clinical Light + Classic stack. Existing users
receive that value through a database default, so migration does not rewrite or
reorder any profile content.

Identifiers and template-specific answer validators live in
`lib/profile-presentation/catalog.ts` and
`lib/profile-presentation/contract.ts`. Configuration may contain only
controlled identifiers, booleans, controlled enums, and references to existing
stable entity IDs. Free-form biographies, labels, destinations, contact or
clinical values belong in the existing content models and must never be copied
into `answers`.

## Persistence and publication

`public.users` remains the private source of truth and stores independent draft
and published configurations with monotonic revisions:

- `profile_presentation_draft` and `profile_presentation_draft_revision`
- `profile_presentation_published` and
  `profile_presentation_published_revision`

Saving a draft does not modify the public profile. Publication atomically copies
the current draft to the published field only when both expected revisions still
match. A stale save or publish returns a concurrency conflict; callers must
reload rather than overwrite newer work. To roll back, save a previously
published, still-valid configuration as the next draft and publish it normally.
Revision history remains monotonic.

The only owner write APIs are:

- `save_profile_presentation_draft(uuid, bigint, jsonb)`
- `publish_profile_presentation(uuid, bigint, bigint)`

Both authenticate the actor, authorize the target, re-check the current
subscription/trial, validate the complete configuration in PostgreSQL, and use
compare-and-swap revisions. Direct updates to the presentation columns are not
granted to authenticated users.

`public.public_profiles` contains only the entitlement-effective published
configuration and its published revision. The existing private synchronization
trigger owns this projection. Drafts are never projected, and application code
must never write to `public_profiles` directly.

## Entitlement behavior

Classic stack and the first four curated themes are free. Premium Contrast and
all non-classic layouts require `PRO`, `PREMIUM PRO`, or an active trial. Layouts
are also allow-listed per template.

The full saved configuration remains private after a downgrade. The public
projection deterministically substitutes Clinical Light and Classic stack while
preserving the template and controlled answers. Re-entitlement therefore
restores the saved intent through the same subscription-triggered projection.
Unauthorized premium data is never embedded in anonymous responses.

## Compatibility and migration rules

- Missing configuration resolves to the current Basic default.
- The controlled legacy v0 snake-case envelope migrates to v1 in shared code.
- Unknown, retired, malformed, or unsupported future versions render Basic
  safely; they do not delete owner content.
- A paid configuration viewed after entitlement loss keeps its template and
  answers but falls back to free theme/layout settings.
- Public selectors consume `public_profiles.profile_presentation`; owner/editor
  selectors may read draft state only through the authenticated server
  repository.
- Preview code must receive an explicit verified preview context and must not
  publish or emit owner-profile conversion analytics.

## Registering a template, theme, layout, or version

1. Add the stable identifier and metadata to the controlled catalog. Never
   rename a released identifier; retire it with a documented fallback.
2. Define the exact semantic module order and allowed layout combinations.
3. Add or update the strict answer schema. Reuse content entity IDs; do not add
   duplicate content or free-form values.
4. Mirror the allow-list and validation rules in a reviewed database migration.
5. Add migration, round-trip, malformed-input, permission, entitlement,
   projection, concurrency, and downgrade fixtures.
6. For a new schema version, keep the previous parser/render path and write a
   deterministic, side-effect-free forward migration. Do not reinterpret an
   already-released version in place.
7. Regenerate `lib/supabase/database.types.ts`, run the database tests, and
   verify public and preview rendering before release.

Templates change presentation only. Links, videos, treatments, locations,
reviews, products, galleries, and their stable IDs remain in their existing
tables throughout switching, fallback, and rollback.
