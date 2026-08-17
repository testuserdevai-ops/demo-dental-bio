# PFP-LOC-CCM: Locations parity in Clinic and Commerce

Status: Ready  
Template: Clinic and Commerce  
Feature: Locations  
Dependency: ../shared/location-images.md

## Current gap

The renderer does not consume saved locations.

## User story

As a profile owner, I want every saved location and its optional image is visible in this template, so changing templates never hides content I saved in the dashboard.

## Scope

- Render every valid saved location rather than selecting only the first.
- Consume the optional per-location image, alt text, and decorative flag introduced by the shared location-image story.
- A selector, cards, carousel, or other template-specific deterministic order is allowed as long as every location remains reachable.
- Preserve per-location address, map, booking, phone, and email behavior without copying contact values into analytics.
- Reuse project-owned public-profile components and shadcn primitives; keep template-specific JSX responsibility-focused.
- Trigger the dashboard preview exactly once after a successful related mutation and never after a failed mutation.

## Acceptance criteria

- Seed more items than the current cap and prove every eligible item is visible on the public profile.
- Add, edit, delete, and reorder coverage where the dashboard supports those operations; a full reload preserves the same result.
- Empty, null-related, disabled, blank-title, or invalid-URL records follow the existing public data policy without crashing the template.
- Use controlled location, map, booking, phone, email, and CTA descriptors with immutable location IDs and one-based visible positions.
- Component/unit coverage, the relevant Playwright flow, mobile viewport coverage, and axe checks pass.
- Production analytics transport remains disabled.

## PR evidence

- One focused PR implements only this story plus unavoidable shared adaptations.
- The master reviewer captures matching before/after screenshots from port 3001 using the same seeded profile, viewport, route, and scroll target.
- The screenshots are attached to the PR with captions explaining the visible difference.
- Because this closes a verified public-profile defect, create or update exactly one Trello Bug story, assign exactly one priority, and move it to Done 🎉 only after verification and PR/commit references are present.
