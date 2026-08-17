# PFP-SVC-SPA: Services parity in Specialist Assessment

Status: Ready  
Template: Specialist Assessment  
Feature: Services  
Dependency: ../shared/treatment-service-section-titles.md

## Current gap

Services are explicitly filtered out.

## User story

As a profile owner, I want every valid saved service is visible in this template, so changing templates never hides content I saved in the dashboard.

## Scope

- Use the shared treatment/service partition rather than treating services as treatments.
- Render every valid service item in a distinct Services surface; remove combined-list caps and treatment-only filters.
- Use the owner-configured Services section title as the accessible heading; template copy may remain as an eyebrow or subtitle.
- A template-specific deterministic order and visual treatment are allowed, but no saved service may be silently omitted or duplicated.
- Reuse project-owned public-profile components and shadcn primitives; keep template-specific JSX responsibility-focused.
- Trigger the dashboard preview exactly once after a successful related mutation and never after a failed mutation.

## Acceptance criteria

- Seed more items than the current cap and prove every eligible item is visible on the public profile.
- Add, edit, delete, and reorder coverage where the dashboard supports those operations; a full reload preserves the same result.
- Empty, null-related, disabled, blank-title, or invalid-URL records follow the existing public data policy without crashing the template.
- Preserve controlled service interaction descriptors with immutable treatment IDs and one-based visible positions wherever cards are interactive.
- Component/unit coverage, the relevant Playwright flow, mobile viewport coverage, and axe checks pass.
- Production analytics transport remains disabled.

## PR evidence

- One focused PR implements only this story plus unavoidable shared adaptations.
- The master reviewer captures matching before/after screenshots from port 3001 using the same seeded profile, viewport, route, and scroll target.
- The screenshots are attached to the PR with captions explaining the visible difference.
- Because this closes a verified public-profile defect, create or update exactly one Trello Bug story, assign exactly one priority, and move it to Done 🎉 only after verification and PR/commit references are present.
