# PFP-SHARED-LOCATION-IMAGES: Owner-managed images for locations

Status: Ready  
Scope: `/dashboard/location`, storage/database contracts, and public locations

## Current gap

A saved location has address and coordinates but no owner-managed image,
alternative text, or decorative-image setting. Templates currently borrow
unrelated general-gallery images or show locations without imagery.

## User story

As a profile owner, I want to add, replace, preview, and remove an image in each
location form, so every template can present the correct image for that
specific location.

## Data, storage, and server contract

- Add optional location image URL/path, alt text, and decorative state through
  the repository's imperative Supabase migration workflow.
- Use the project storage/upload policy with dentistry/location-scoped object
  paths, safe MIME/size limits, ownership checks, replacement cleanup, and no
  public service-role exposure.
- Extend generated database types, restricted location RPCs, strict DTOs,
  dashboard/public queries, cache tags, seed data, and verifiers.
- Image alt text is required for informative images and must be empty when the
  image is explicitly decorative.
- Deleting or replacing a location image must avoid orphaning material storage
  objects; location deletion must follow the same cleanup policy.
- Preserve the `public.users` / `public.public_profiles` boundary and never
  write directly to `public_profiles`.

## Dashboard UI

- Extend both create and edit location forms with project-owned image upload,
  preview, replace, remove, alt-text, and decorative controls.
- Preserve drafts and existing location data when upload or save fails.
- Expose explicit upload/save progress and accessible validation errors.
- Successful changes reconcile authoritative query data, invalidate location
  and public-profile cache tags, and trigger exactly one preview reload.
- Dashboard/editor controls are excluded from owner-profile conversion
  analytics.

## Public consumption contract

- Every location view-model entry exposes its own optional image metadata.
- Templates may choose different image proportions and placement but must use
  the image belonging to that location, never an unrelated gallery fallback.
- SafeImage semantics, responsive sizes, owner alt text, and decorative
  behavior are required.

## Acceptance criteria

- Unit and database tests cover create, update, replace, remove, delete,
  ownership, invalid file, storage failure, and concurrent update behavior.
- Playwright covers upload, preview, persistence after reload, removal, mobile
  layout, and axe.
- A test query verifies the saved public location projection and owner
  isolation.
- Prettier, typecheck, lint, focused unit tests, production build, Playwright,
  and axe checks pass in proportion to the change.
- The PR contains master-captured before/after screenshots from port 3001 and
  exactly one verified Trello Bug story.
