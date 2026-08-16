# PFP-TRT-CCM: Treatments parity in Clinic and Commerce

Status: Ready  
Template: Clinic and Commerce  
Feature: Treatments  
Dependency: ../shared/treatment-service-section-titles.md

## Current gap

Only the first three combined treatment/service records are shown in one clinic grid.

## User story

As a profile owner, I want every valid saved treatment is visible in this template, so changing templates never hides content I saved in the dashboard.

## Scope

- Use the shared treatment/service partition rather than template-specific inclusion logic.
- Render every valid non-service item; remove caps and featured/signature eligibility gates.
- Use the owner-configured Treatments section title as the accessible heading; template copy may remain as an eyebrow or subtitle.
- A template-specific deterministic order and visual treatment are allowed, but no saved treatment may be silently omitted or duplicated.
- Reuse project-owned public-profile components and shadcn primitives; keep template-specific JSX responsibility-focused.
- Trigger the dashboard preview exactly once after a successful related mutation and never after a failed mutation.

## Acceptance criteria

- Seed more items than the current cap and prove every eligible item is visible on the public profile.
- Add, edit, delete, and reorder coverage where the dashboard supports those operations; a full reload preserves the same result.
- Empty, null-related, disabled, blank-title, or invalid-URL records follow the existing public data policy without crashing the template.
- Preserve controlled treatment interaction descriptors with immutable treatment IDs and one-based visible positions wherever cards are interactive.
- Component/unit coverage, the relevant Playwright flow, mobile viewport coverage, and axe checks pass.
- Production analytics transport remains disabled.

## PR evidence

- One focused PR implements only this story plus unavoidable shared adaptations.
- The master reviewer captures matching before/after screenshots from port 3001 using the same seeded profile, viewport, route, and scroll target.
- The screenshots are attached to the PR with captions explaining the visible difference.
- Because this closes a verified public-profile defect, create or update exactly one Trello Bug story, assign exactly one priority, and move it to Done 🎉 only after verification and PR/commit references are present.
