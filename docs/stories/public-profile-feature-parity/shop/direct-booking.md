# PFP-SHP-DBK: Shop parity in Direct Booking

Status: Ready  
Template: Direct Booking  
Feature: Shop  
Dependency: None

## Current gap

The renderer does not consume the product inventory.

## User story

As a profile owner, I want every eligible saved product is reachable in this template, so changing templates never hides content I saved in the dashboard.

## Scope

- Render every enabled product with a valid ID, owner-authored label, and safe outbound URL.
- A featured product may be emphasized or ordered first but may not hide the complete product inventory.
- Preserve deterministic product order and show the existing outbound-commerce disclosure where product CTAs appear.
- Hide the section cleanly when no eligible products exist.
- Reuse project-owned public-profile components and shadcn primitives; keep template-specific JSX responsibility-focused.
- Trigger the dashboard preview exactly once after a successful related mutation and never after a failed mutation.

## Acceptance criteria

- Seed more items than the current cap and prove every eligible item is visible on the public profile.
- Add, edit, delete, and reorder coverage where the dashboard supports those operations; a full reload preserves the same result.
- Empty, null-related, disabled, blank-title, or invalid-URL records follow the existing public data policy without crashing the template.
- Use the controlled product-click descriptor with immutable product ID and one-based visible position; navigation must not wait for tracking.
- Component/unit coverage, the relevant Playwright flow, mobile viewport coverage, and axe checks pass.
- Production analytics transport remains disabled.

## PR evidence

- One focused PR implements only this story plus unavoidable shared adaptations.
- The master reviewer captures matching before/after screenshots from port 3001 using the same seeded profile, viewport, route, and scroll target.
- The screenshots are attached to the PR with captions explaining the visible difference.
- Because this closes a verified public-profile defect, create or update exactly one Trello Bug story, assign exactly one priority, and move it to Done 🎉 only after verification and PR/commit references are present.
