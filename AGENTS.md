# Repository instructions for AI coding agents

## Next.js App Router architecture

Follow current official Next.js App Router guidance and preserve the existing
repository organization:

- Keep route entrypoints, layouts, metadata, loading/error boundaries, Route
  Handlers, and route composition in `app`.
- Put shared browser-neutral contracts, validation, data policy, and server
  utilities in root `lib`.
- Put application-wide React providers in `app/contexts`.
- Put shared React behavior and components in `app/components`; reserve
  `app/components/ui` for visual design-system primitives.
- Colocate route-only implementation in private `_components` or `_lib`
  directories when it is not shared outside that route.
- Do not introduce a new top-level `features`, `modules`, or similar taxonomy
  for a single capability. Adopt a new repository-wide organization only as an
  explicit architectural change.

Default to Server Components. Add `"use client"` only at the smallest
interactive component or provider boundary, mark privileged modules with
`server-only`, and pass only minimal serializable props from server to client.
Do not create barrel exports that mix server-only and client modules. Prefer
Next.js `Link`, image, metadata, navigation, Server Action, and Route Handler
behavior over recreating framework features with raw browser code.

## User-interaction analytics is part of the UI contract

Whenever you add or change user-facing interactive UI, explicitly assess its
analytics behavior as part of the implementation. Do not treat analytics as a
later cleanup task.

For every new owner-facing interaction on a public profile—including links,
buttons, calls to action, expandable content, media/lightbox triggers, share
actions, contact actions, product actions, and section navigation—you must:

1. Use the project-owned analytics adapters:
   - `app/components/analytics/TrackedAction.tsx` for `TrackedLink`,
     `TrackedButton`, and `PublicAction`;
   - `app/contexts/AnalyticsContext.tsx` for `AnalyticsProvider` and
     `useTrackedAction`;
   - `lib/analytics` for contracts, transports, and server policy.
     Use `TrackedLink` for native anchors, `TrackedButton` or `PublicAction` for
     native buttons, and `useTrackedAction` when an event is valid only after an
     asynchronous success, such as a successful clipboard copy.
2. Add or reuse a controlled descriptor in
   `lib/analytics/contract.ts`. Never introduce an arbitrary event name or
   free-form analytics payload at the component call site.
3. Include the immutable profile ID through `AnalyticsProvider`, the correct
   controlled section, relevant stable entity IDs, and a one-based visible
   position after filtering and sorting when the action belongs to a list.
4. Emit both the specific controlled action and generic `cta_click` descriptor
   for a primary or sticky CTA when applicable.
5. Preserve native semantics and behavior: real anchors and buttons, forwarded
   refs, accessibility names, keyboard activation, modified clicks,
   `target`/`rel`/`download`, and navigation that never waits for tracking.
6. Keep preview/test context explicit and server-verifiable. Never infer an
   exclusion from referrer, iframe state, or a query flag alone. Do not bypass
   `AnalyticsProvider` or enable a production transport.
7. Preserve existing counters and endpoints as separate legacy adapters until
   their downstream replacement is explicitly approved. Verified dashboard
   previews must not mutate those public counters.

Do not send clinical or enquiry values, arbitrary DOM text, labels/titles,
destination URLs, usernames or query strings, email addresses, phone numbers,
full IP addresses, auth identifiers, secrets, or other free-form values in an
analytics descriptor. Update the strict Zod contract and its privacy rejection
tests whenever the controlled vocabulary changes.

Dashboard/editor controls, platform-acquisition links, and pure close/dismiss
controls are excluded from owner-profile conversion analytics unless a product
requirement explicitly brings them into scope. Record that decision in the
migration matrix rather than silently omitting an ambiguous public action.

## Required verification for interactive UI changes

When adding or changing a tracked interaction:

- add or update contract/descriptor coverage under `lib/analytics`;
- test native link/button semantics and tracking failure independence;
- update `docs/analytics-foundation.md` when adding a new action family or
  changing an exclusion;
- extend the relevant Playwright flow and accessibility coverage for a new
  public surface;
- run Prettier, typecheck, lint, unit tests, production build, Playwright, and
  axe checks in proportion to the change.

Production analytics emission remains disabled until a separately reviewed
server ingestion, consent, ownership, idempotency, limits, and retention design
is implemented. Adding interactive UI never authorizes enabling that transport.
