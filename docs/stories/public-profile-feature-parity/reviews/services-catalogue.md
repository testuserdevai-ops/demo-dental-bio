# PFP-REV-SCG: Reviews parity in Services Catalogue

Status: Ready  
Template: Services Catalogue  
Feature: Reviews  
Dependency: None

## Current gap

Review cards are capped at three and only the first external review page is reachable.

## User story

As a profile owner, I want every valid saved review and external review page is represented in this template, so changing templates never hides content I saved in the dashboard.

## Scope

- Render every enabled valid review; an aggregate rating or highlighted quote may supplement but never replace the full list.
- Render every valid external review page in a clearly labelled More reviews surface rather than selecting only the first.
- Remove featured-review and fixed-card caps as visibility gates; template-specific ordering and emphasis remain allowed.
- Hide review and external-review subsections independently when their inventories are empty.
- Reuse project-owned public-profile components and shadcn primitives; keep template-specific JSX responsibility-focused.
- Trigger the dashboard preview exactly once after a successful related mutation and never after a failed mutation.

## Acceptance criteria

- Seed more items than the current cap and prove every eligible item is visible on the public profile.
- Add, edit, delete, and reorder coverage where the dashboard supports those operations; a full reload preserves the same result.
- Empty, null-related, disabled, blank-title, or invalid-URL records follow the existing public data policy without crashing the template.
- Use controlled external-review descriptors with immutable review-page IDs and one-based visible positions; static review cards need no click event.
- Component/unit coverage, the relevant Playwright flow, mobile viewport coverage, and axe checks pass.
- Production analytics transport remains disabled.

## PR evidence

- One focused PR implements only this story plus unavoidable shared adaptations.
- The master reviewer captures matching before/after screenshots from port 3001 using the same seeded profile, viewport, route, and scroll target.
- The screenshots are attached to the PR with captions explaining the visible difference.
- Because this closes a verified public-profile defect, create or update exactly one Trello Bug story, assign exactly one priority, and move it to Done 🎉 only after verification and PR/commit references are present.
