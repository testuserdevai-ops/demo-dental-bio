# PFP-SHARED-TITLES: Owner-defined treatment and service section titles

Status: Ready  
Scope: `/dashboard/treatments`, public profile contracts, and every template

## Current gap

Treatment and service records have item titles, but the owner cannot define the
public section titles. Templates therefore hard-code inconsistent headings such
as “Featured treatments,” “Support services,” and “Featured family services.”

## User story

As a profile owner, I want separate Treatment section title and Service section
title inputs on `/dashboard/treatments`, so both sections can use my preferred
language while each template retains its own visual design.

## Data and server contract

- Add dentistry-owned nullable/defaulted fields for treatment and service
  section titles through the repository's imperative Supabase migration
  workflow; do not store these values on individual treatment rows.
- Default blank or legacy values to “Treatments” and “Services.”
- Extend generated database types, authorized dashboard queries/actions, the
  public view model, cache invalidation, and relevant seed/verifier coverage.
- Use strict Zod validation at client and server boundaries: trimmed,
  owner-authored plain text, 1–100 characters, with no arbitrary analytics
  payload.
- Preserve the `public.users` / `public.public_profiles` boundary and never
  write directly to `public_profiles`.

## Dashboard UI

- Add two clearly labelled shadcn form inputs above the item managers:
  “Treatment section title” and “Service section title.”
- Save independently or atomically with an explicit pending, success, and error
  state; failed saves retain the user's draft.
- Successful saves update authoritative query data, invalidate the public
  profile cache, and trigger exactly one preview reload.
- Dashboard/editor controls remain excluded from owner-profile conversion
  analytics; document the exclusion if it is not already explicit.

## Template consumption contract

- The configured title is the accessible primary heading for that inventory.
- A template may add an eyebrow, subtitle, or special card treatment, but must
  not replace the owner-configured heading with hard-coded eligibility language.
- Do not introduce new owner-facing static copy in a template renderer. Any
  genuinely template-specific supplemental copy must have an owner-editable
  dashboard input shown only for templates that use it.
- Treatments and services may use different layouts and deterministic ordering,
  but every eligible saved item must remain visible.

## Acceptance criteria

- New, existing, blank/default, admin-managed, preview, and public-profile flows
  are covered.
- Unit tests cover strict schemas, authorization, cache invalidation, query
  reconciliation, and failure independence.
- Playwright covers editing both titles, immediate preview refresh, public
  reload persistence, mobile layout, and axe.
- Supabase test queries prove owner isolation and trigger/projection behavior.
- Prettier, typecheck, lint, focused unit tests, production build, Playwright,
  and axe checks pass in proportion to the change.
- The PR contains master-captured public and dashboard before/after screenshots
  from port 3001 and exactly one prioritized Trello Bug story.
