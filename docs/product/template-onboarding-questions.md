# Template-specific onboarding questions

The question engine is the third step of profile setup, after a user chooses a
color theme and content template. Its canonical route is
`/onboarding/questions?template=<controlled-template-id>`. The authenticated
saved draft—not the query string—is authoritative.

## Controlled registry

`lib/profile-presentation/questions/registry.ts` registers one versioned,
ordered question set for Basic and each of the eight templates. A set contains:

- stable question IDs and the presentation schema version;
- required or optional status, help text, controlled input kind, and limits;
- declarative equality conditions for follow-up questions;
- existing-content source and builder route for entity selectors; and
- the template's deterministic output-module order for draft review.

Conditions are data, not callbacks or template-authored executable code. The
client and server call the same validation function. Unknown fields, option IDs,
duplicate IDs, deleted or foreign entity IDs, and over-limit selections fail
closed with field-specific errors.

Basic intentionally has a minimal content-readiness step because it uses no
template answers. The other sets differ based on their approved information
architecture: booking actions and treatments, location routing, service
priority, cosmetic proof, family-practice trust, specialist eligibility,
patient/professional routing, or clinic/commerce emphasis.

## Existing content boundary

Questions never copy editable profile content into the appearance envelope.
They reference owner-scoped treatments, locations, reviews, before-and-after
cases, links, and products by their existing stable IDs. Labels are returned to
the authenticated UI only. Empty selectors link back to the corresponding
existing dashboard builder. Bio, link destinations, video URLs, contact values,
clinical descriptions, gallery media, review text, and product data remain in
their existing source tables and builder flows.

## Persistence and recovery

Every controlled selection autosaves through
`saveProfilePresentationDraft`. The action:

1. resolves the authenticated dashboard identity;
2. rereads the private presentation draft and current owner-scoped options;
3. validates the template and every answer at the server boundary;
4. preserves theme, template, layout, unrelated answers, and entity IDs;
5. performs compare-and-swap using the draft revision; and
6. retries once only when a stale edit does not touch the same answer field.

An idempotent save does not advance the revision. A same-field conflict retains
the browser's answers and offers an explicit reload. Missing, malformed, or
unsupported drafts cannot be overwritten through the question action. Refresh,
stable step URLs, browser back/forward navigation, and “Finish later” all resume
from the saved draft.

Completing the questions reruns required validation and opens an in-route draft
review with human-readable selections and module order. It never publishes,
changes a plan, mutates builder entities, or writes `public_profiles`.

## Accessibility and mobile behavior

- Each question is a native labelled fieldset with associated help and errors.
- Conditional steps enter the normal reading and keyboard order only when their
  controlled condition is satisfied.
- Navigation focuses the new step heading; validation focuses the first error.
- Saving, saved, and failed states are announced without exposing answer values.
- Empty, locked, loading, and route-error states preserve a safe recovery path.
- On mobile, the advance actions remain in a bottom action surface with safe-area
  padding; the content includes clearance and errors include scroll margin so
  controls are not obscured.
- Onboarding controls are explicitly excluded from owner-profile conversion
  analytics. No production analytics transport is enabled.
