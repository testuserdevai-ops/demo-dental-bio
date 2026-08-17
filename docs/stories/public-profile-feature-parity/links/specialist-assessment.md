# PFP-LNK-SPA: Links parity in Specialist Assessment

Status: Ready  
Template: Specialist Assessment  
Feature: Links  
Dependency: None

## Current gap

Only links matching assessment, emergency, insurance, referral, or FAQ patterns are visible.

## User story

As a profile owner, I want every active valid saved link is reachable in this template, so changing templates never hides content I saved in the dashboard.

## Scope

- Render every active valid saved link and preserve stable group/link identity.
- Classification may influence grouping or emphasis, but unmatched links must fall back to an Other resources group instead of disappearing.
- Remove fixed result caps; a featured CTA may supplement the full list but cannot consume or hide its source link.
- Use deterministic group and item ordering, even when the template chooses a different visual order.
- Reuse project-owned public-profile components and shadcn primitives; keep template-specific JSX responsibility-focused.
- Trigger the dashboard preview exactly once after a successful related mutation and never after a failed mutation.

## Acceptance criteria

- Seed more items than the current cap and prove every eligible item is visible on the public profile.
- Add, edit, delete, and reorder coverage where the dashboard supports those operations; a full reload preserves the same result.
- Empty, null-related, disabled, blank-title, or invalid-URL records follow the existing public data policy without crashing the template.
- Use the controlled link descriptor with group ID, link ID, and one-based visible position; preserve the separate legacy counter policy.
- Component/unit coverage, the relevant Playwright flow, mobile viewport coverage, and axe checks pass.
- Production analytics transport remains disabled.

## PR evidence

- One focused PR implements only this story plus unavoidable shared adaptations.
- The master reviewer captures matching before/after screenshots from port 3001 using the same seeded profile, viewport, route, and scroll target.
- The screenshots are attached to the PR with captions explaining the visible difference.
- Because this closes a verified public-profile defect, create or update exactly one Trello Bug story, assign exactly one priority, and move it to Done 🎉 only after verification and PR/commit references are present.
