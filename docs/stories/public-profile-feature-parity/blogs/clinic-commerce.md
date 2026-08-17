# PFP-BLG-CCM: Blogs parity in Clinic and Commerce

Status: Ready  
Template: Clinic and Commerce  
Feature: Blogs  
Dependency: None

## Current gap

The renderer does not consume enabled blog groups or blog entries.

## User story

As a profile owner, I want every enabled saved blog is discoverable in this template, so changing templates never hides content I saved in the dashboard.

## Scope

- Render every enabled blog group and enabled blog entry supplied by the public view model.
- Preserve stable group identity, post identity, and valid public blog routes.
- Do not introduce a fixed display cap; template-specific layout and deterministic ordering are allowed.
- Hide the section cleanly when no enabled blogs exist.
- Reuse project-owned public-profile components and shadcn primitives; keep template-specific JSX responsibility-focused.
- Trigger the dashboard preview exactly once after a successful related mutation and never after a failed mutation.

## Acceptance criteria

- Seed more items than the current cap and prove every eligible item is visible on the public profile.
- Add, edit, delete, and reorder coverage where the dashboard supports those operations; a full reload preserves the same result.
- Empty, null-related, disabled, blank-title, or invalid-URL records follow the existing public data policy without crashing the template.
- Use existing controlled blog/link navigation behavior and preserve native links without waiting for tracking.
- Component/unit coverage, the relevant Playwright flow, mobile viewport coverage, and axe checks pass.
- Production analytics transport remains disabled.

## PR evidence

- One focused PR implements only this story plus unavoidable shared adaptations.
- The master reviewer captures matching before/after screenshots from port 3001 using the same seeded profile, viewport, route, and scroll target.
- The screenshots are attached to the PR with captions explaining the visible difference.
- Because this closes a verified public-profile defect, create or update exactly one Trello Bug story, assign exactly one priority, and move it to Done 🎉 only after verification and PR/commit references are present.
