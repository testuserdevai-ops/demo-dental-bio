# PFP-GAL-SCG: Gallery parity in Services Catalogue

Status: Ready  
Template: Services Catalogue  
Feature: Gallery  
Dependency: None

## Current gap

The renderer consumes neither before/after cases nor general-gallery images.

## User story

As a profile owner, I want every enabled before/after case and general-gallery image is visible in this template, so changing templates never hides content I saved in the dashboard.

## Scope

- Render the complete enabled before/after gallery and complete enabled general gallery.
- A template may reuse an image as a hero or location accent, but that reuse must not remove it from the complete gallery inventory.
- Remove featured-gallery and fixed-image caps as visibility gates; template-specific layout and deterministic ordering remain allowed.
- Preserve owner-authored labels, alt text/decorative semantics, safe images, and responsive layout.
- Reuse project-owned public-profile components and shadcn primitives; keep template-specific JSX responsibility-focused.
- Trigger the dashboard preview exactly once after a successful related mutation and never after a failed mutation.

## Acceptance criteria

- Seed more items than the current cap and prove every eligible item is visible on the public profile.
- Add, edit, delete, and reorder coverage where the dashboard supports those operations; a full reload preserves the same result.
- Empty, null-related, disabled, blank-title, or invalid-URL records follow the existing public data policy without crashing the template.
- Use existing controlled gallery/lightbox descriptors with immutable gallery IDs and one-based visible positions for interactive media.
- Component/unit coverage, the relevant Playwright flow, mobile viewport coverage, and axe checks pass.
- Production analytics transport remains disabled.

## PR evidence

- One focused PR implements only this story plus unavoidable shared adaptations.
- The master reviewer captures matching before/after screenshots from port 3001 using the same seeded profile, viewport, route, and scroll target.
- The screenshots are attached to the PR with captions explaining the visible difference.
- Because this closes a verified public-profile defect, create or update exactly one Trello Bug story, assign exactly one priority, and move it to Done 🎉 only after verification and PR/commit references are present.
